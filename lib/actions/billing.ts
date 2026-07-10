'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { getStripe, priceIdForPlan } from '@/lib/stripe/client';
import type { PlanId } from '@/lib/plan/plans';

interface BillingResult {
  url?: string;
  /** 既存サブスクをその場で変更した場合 true（新規 Checkout ではない） */
  changed?: boolean;
  error?: string;
}

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000';
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

interface TeamBillingRow {
  id: string;
  name: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
}

/** アクティブとみなすサブスク状態（この間はプラン変更 = 既存サブスクの更新にする） */
function isActiveSub(status: string | null): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

/** admin 権限を確認しつつ、課金対象チームの行を返す。 */
async function requireAdminTeam(
  teamSlug: string
): Promise<{ team: TeamBillingRow; adminEmail: string | null } | { error: string }> {
  const resolved = await resolveTeamFromSlug(teamSlug);
  if (resolved.role !== 'admin' && !resolved.isSuperAdmin) {
    return { error: 'チーム admin 権限が必要です' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = getAdminClient();
  const { data: team, error } = await admin
    .from('teams' as any)
    .select('id, name, stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('id', resolved.teamId)
    .single();
  if (error || !team) return { error: 'チームが見つかりません' };

  return { team: team as unknown as TeamBillingRow, adminEmail: user?.email ?? null };
}

/**
 * 既存の Stripe customer を返す。無ければ作成して teams に保存する。
 */
async function ensureStripeCustomer(
  team: TeamBillingRow,
  adminEmail: string | null
): Promise<string> {
  if (team.stripe_customer_id) return team.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: team.name,
    email: adminEmail ?? undefined,
    metadata: { team_id: team.id },
  });

  const admin = getAdminClient();
  await (admin.from('teams' as any) as any)
    .update({ stripe_customer_id: customer.id })
    .eq('id', team.id);

  return customer.id;
}

/**
 * プランを選択/変更する。admin 限定。
 *
 * - **既存サブスクあり**（active/trialing/past_due）: 既存サブスクの price を
 *   その場で更新（日割り）。新規サブスクは作らない = 二重課金を防ぐ。
 *   → `{ changed: true }` を返し、実際の plan/max 反映は
 *     `customer.subscription.updated` webhook が行う。
 * - **サブスク未保有**: 新規 Checkout セッションを作成し `{ url }` を返す。
 */
export async function selectPlan(
  teamSlug: string,
  plan: Exclude<PlanId, 'free'>
): Promise<BillingResult> {
  if (plan !== 'starter' && plan !== 'pro') {
    return { error: '不正なプランです' };
  }

  const ctx = await requireAdminTeam(teamSlug);
  if ('error' in ctx) return { error: ctx.error };
  const { team } = ctx;

  try {
    const stripe = getStripe();

    // --- 既存サブスクがある場合: その場でプラン変更（新規は作らない） ---
    if (team.stripe_subscription_id && isActiveSub(team.subscription_status)) {
      const sub = await stripe.subscriptions.retrieve(team.stripe_subscription_id);
      const itemId = sub.items.data[0]?.id;
      if (!itemId) return { error: '既存サブスクの明細が取得できませんでした' };

      await stripe.subscriptions.update(team.stripe_subscription_id, {
        items: [{ id: itemId, price: priceIdForPlan(plan) }],
        proration_behavior: 'create_prorations', // 差額を日割り
        metadata: { team_id: team.id, plan },
      });
      return { changed: true };
    }

    // --- 新規申込: Checkout セッション ---
    const customerId = await ensureStripeCustomer(team, ctx.adminEmail);
    const siteUrl = resolveSiteUrl();
    const returnBase = `${siteUrl}/t/${teamSlug}/admin/billing`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
      success_url: `${returnBase}?checkout=success`,
      cancel_url: `${returnBase}?checkout=cancel`,
      // webhook 側で team を特定できるよう metadata を付与
      metadata: { team_id: team.id, plan },
      subscription_data: {
        metadata: { team_id: team.id, plan },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) return { error: '決済ページの生成に失敗しました' };
    return { url: session.url };
  } catch (e: any) {
    return { error: e?.message ?? 'プランの処理に失敗しました' };
  }
}

/**
 * Stripe Customer Portal(プラン変更/解約/支払い方法更新)の URL を返す。
 * admin 限定。既に customer が存在する(=一度でも課金した)チームのみ。
 */
export async function createPortalSession(teamSlug: string): Promise<BillingResult> {
  const ctx = await requireAdminTeam(teamSlug);
  if ('error' in ctx) return { error: ctx.error };

  if (!ctx.team.stripe_customer_id) {
    return { error: 'まだ課金情報がありません。先にプランを申し込んでください。' };
  }

  try {
    const stripe = getStripe();
    const siteUrl = resolveSiteUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.team.stripe_customer_id,
      return_url: `${siteUrl}/t/${teamSlug}/admin/billing`,
    });
    return { url: session.url };
  } catch (e: any) {
    return { error: e?.message ?? 'ポータルの生成に失敗しました' };
  }
}
