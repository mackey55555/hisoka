import type Stripe from 'stripe';
import { getStripe, planForPriceId } from '@/lib/stripe/client';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPlanConfig, PLANS } from '@/lib/plan/plans';
import { enforceSeatLimit, restoreAutoLockedSeats } from '@/lib/plan/seat-enforcement';

// 署名検証のため raw body が必要。Node ランタイムで動かす。
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET 未設定');
    return new Response('misconfigured', { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    console.error('[stripe-webhook] 署名検証失敗:', err?.message);
    return new Response(`invalid signature`, { status: 400 });
  }

  const admin = getAdminClient();

  // --- 冪等性: 処理済みイベントはスキップ ---
  const { error: dupError } = await (admin.from('stripe_events' as any) as any).insert({
    id: event.id,
    type: event.type,
  });
  if (dupError) {
    // 主キー重複 = 既に処理済み。200 で ack して再送を止める。
    if ((dupError as any).code === '23505') {
      return Response.json({ received: true, duplicate: true });
    }
    console.error('[stripe-webhook] stripe_events 記録失敗:', dupError);
    // 記録できないと二重処理の恐れがあるため 500 で再送させる
    return new Response('event log failed', { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const subscription = await getStripe().subscriptions.retrieve(subId);
          await syncSubscription(subscription, session.metadata?.team_id ?? null);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription, subscription.metadata?.team_id ?? null);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await downgradeToFree(subscription);
        break;
      }
      default:
        // 未購読/未対応イベントは無視
        break;
    }
  } catch (err: any) {
    console.error(`[stripe-webhook] ${event.type} 処理中エラー:`, err?.message);
    return new Response('handler error', { status: 500 });
  }

  return Response.json({ received: true });
}

/**
 * Stripe subscription の状態を teams に反映する。
 * plan は price ID から判定し、max_members もプラン設定で上書きする。
 */
async function syncSubscription(
  subscription: Stripe.Subscription,
  metadataTeamId: string | null
) {
  const admin = getAdminClient();

  const teamId = await resolveTeamId(subscription, metadataTeamId);
  if (!teamId) {
    console.error('[stripe-webhook] team を特定できませんでした sub=', subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = planForPriceId(priceId);
  if (!plan || plan === 'free') {
    console.error('[stripe-webhook] 未知の price:', priceId);
    return;
  }

  const cfg = getPlanConfig(plan);
  // current_period_end は新しい API バージョンで subscription 直下 → items[] 配下へ移動。
  // 両対応（旧: 直下 / 新: items[0]）でフォールバックする。
  const periodEnd =
    ((subscription as any).current_period_end as number | undefined) ??
    ((subscription.items?.data?.[0] as any)?.current_period_end as number | undefined);

  // 解約予約(期間満了で終了予定)の終了日時。予約がなければ null。
  const cancelAt = (subscription as any).cancel_at as number | null | undefined;

  const update: Record<string, unknown> = {
    plan,
    max_members: cfg.maxMembers,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at: cancelAt ? new Date(cancelAt * 1000).toISOString() : null,
  };

  // subscription が有効でない(past_due/unpaid/canceled 等)場合でも plan は据え置き、
  // subscription_status で状態を表現する。実運用のダウングレードは
  // customer.subscription.deleted で行う。

  const { error } = await (admin.from('teams' as any) as any)
    .update(update)
    .eq('id', teamId);
  if (error) console.error('[stripe-webhook] teams 更新失敗:', error);

  // アップグレード/再課金で枠が増えたら、降格時に自動ロックしたメンバーを復帰させる。
  const restored = await restoreAutoLockedSeats(admin, teamId, cfg.maxMembers);
  if (restored > 0) console.log(`[stripe-webhook] ${restored}名を自動復帰 team=${teamId}`);
}

/** 解約(sub 完全削除)時に Free へ戻す。 */
async function downgradeToFree(subscription: Stripe.Subscription) {
  const admin = getAdminClient();
  const teamId = await resolveTeamId(subscription, subscription.metadata?.team_id ?? null);
  if (!teamId) return;

  // 削除されたのが「そのチームが現在追跡しているサブスク」でない場合
  // (= 過去/重複サブスクのクリーンアップ)は、チーム状態を変更しない。
  // これをしないと、有効な別サブスクが残っていても Free に落ちてしまう。
  const { data: teamRow } = await admin
    .from('teams' as any)
    .select('stripe_subscription_id')
    .eq('id', teamId)
    .maybeSingle();
  const trackedSubId = (teamRow as any)?.stripe_subscription_id ?? null;
  if (trackedSubId && trackedSubId !== subscription.id) {
    console.log(
      `[stripe-webhook] 追跡外サブスクの削除を無視 team=${teamId} deleted=${subscription.id} tracked=${trackedSubId}`
    );
    return;
  }

  const free = PLANS.free;
  const { error } = await (admin.from('teams' as any) as any)
    .update({
      plan: 'free',
      max_members: free.maxMembers,
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      current_period_end: null,
      cancel_at: null,
    })
    .eq('id', teamId);
  if (error) console.error('[stripe-webhook] Free ダウングレード失敗:', error);

  // Free の上限を超えるメンバーは即ロック（fail closed）。削除はしない＝再課金で復帰。
  const locked = await enforceSeatLimit(admin, teamId, free.maxMembers);
  if (locked > 0) console.log(`[stripe-webhook] ${locked}名を自動ロック team=${teamId}`);
}

/**
 * team_id を特定する。
 * 1. metadata.team_id(checkout / subscription に付与)
 * 2. なければ customer id で teams を逆引き
 */
async function resolveTeamId(
  subscription: Stripe.Subscription,
  metadataTeamId: string | null
): Promise<string | null> {
  if (metadataTeamId) return metadataTeamId;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const admin = getAdminClient();
  const { data } = await admin
    .from('teams' as any)
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return (data as any)?.id ?? null;
}
