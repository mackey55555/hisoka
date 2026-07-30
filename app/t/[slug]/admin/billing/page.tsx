import { notFound } from 'next/navigation';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPlanConfig, PLANS, PLAN_ORDER, historyLabel, type PlanId } from '@/lib/plan/plans';
import { Card } from '@/components/ui/card';
import { PlanCheckoutButton, ManagePortalButton } from './billing-actions';

interface TeamBilling {
  plan: PlanId;
  max_members: number;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  stripe_customer_id: string | null;
}

function featureLines(plan: PlanId): string[] {
  const c = PLANS[plan];
  const lines = [
    `メンバー ${c.maxMembers} 名まで`,
    `過去データ ${historyLabel(plan)}`,
    'AI月次診断',
    c.features.questionSuggest ? 'AI質問サジェスト' : null,
    c.features.reflectionSupport ? 'AI振り返りサポート' : null,
    c.features.export ? 'エクスポート(PDF/CSV)' : null,
  ];
  return lines.filter((l): l is string => Boolean(l));
}

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const team = await resolveTeamFromSlug(slug);
  if (team.role !== 'admin' && !team.isSuperAdmin) notFound();

  const admin = getAdminClient();
  const { data } = await admin
    .from('teams' as any)
    .select('plan, max_members, subscription_status, current_period_end, cancel_at, stripe_customer_id')
    .eq('id', team.teamId)
    .single();

  const row = (data as unknown as TeamBilling) ?? null;
  const currentPlan = getPlanConfig(row?.plan).id;

  // 降格で自動ロックされたメンバー数（アップグレードで復帰する）
  const { count: lockedCount } = await (admin.from('team_members' as any) as any)
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.teamId)
    .not('auto_locked_at', 'is', null);
  const hasCustomer = Boolean(row?.stripe_customer_id);
  const status = row?.subscription_status ?? null;
  const periodEnd = row?.current_period_end
    ? new Date(row.current_period_end).toLocaleDateString('ja-JP')
    : null;
  // アクティブなサブスク保有者 = プラン変更はその場変更(日割り)になる
  const isSubscriber =
    status === 'active' || status === 'trialing' || status === 'past_due';
  // 解約予約あり: cancel_at(未来)がセットされている = その日で現在のプランが終了
  const cancelAtDate =
    row?.cancel_at && new Date(row.cancel_at).getTime() > Date.now()
      ? new Date(row.cancel_at).toLocaleDateString('ja-JP')
      : null;
  const isScheduledToCancel = Boolean(cancelAtDate);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-text-primary mb-6 mt-4">プラン・お支払い</h1>

      {checkout === 'success' && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text-primary">
          お申し込みありがとうございます。プランの反映まで数十秒かかる場合があります。
        </div>
      )}
      {checkout === 'cancel' && (
        <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          お申し込みはキャンセルされました。
        </div>
      )}
      {typeof lockedCount === 'number' && lockedCount > 0 && (
        <div className="mb-6 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-text-primary">
          プラン上限を超えていたため、<span className="font-bold">{lockedCount}名</span>のメンバーが
          ロック（アクセス停止）されています。上位プランにアップグレードすると、参加が早い順に自動で復帰します。
          メンバーのデータは削除されていません。
        </div>
      )}

      <Card className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-text-secondary">現在のプラン</p>
            <p className="text-xl font-bold text-text-primary">
              {getPlanConfig(currentPlan).label}
              {currentPlan !== 'free' && (
                <span className="ml-2 text-sm font-normal text-text-secondary">
                  ¥{PLANS[currentPlan].priceJpy.toLocaleString()}/月
                </span>
              )}
            </p>
            {status && status !== 'active' && (
              <p className="mt-1 text-sm text-error">支払い状態: {status}</p>
            )}
            {isScheduledToCancel ? (
              <p className="mt-1 text-sm text-error">
                {cancelAtDate} に解約予定（この日まで {getPlanConfig(currentPlan).label} をご利用いただけます。以降は Free に移行します）
              </p>
            ) : (
              periodEnd && (
                <p className="mt-1 text-xs text-text-secondary">次回更新: {periodEnd}</p>
              )
            )}
          </div>
          {hasCustomer && <ManagePortalButton slug={slug} />}
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {PLAN_ORDER.map((planId) => {
          const c = PLANS[planId];
          const isCurrent = planId === currentPlan;
          return (
            <Card
              key={planId}
              className={isCurrent ? 'border-2 border-primary' : ''}
            >
              <h2 className="text-lg font-bold text-text-primary">{c.label}</h2>
              <p className="mt-1 mb-4 text-2xl font-bold text-text-primary">
                {c.priceJpy === 0 ? '¥0' : `¥${c.priceJpy.toLocaleString()}`}
                <span className="text-sm font-normal text-text-secondary">/月</span>
              </p>
              <ul className="mb-6 space-y-1 text-sm text-text-secondary">
                {featureLines(planId).map((line) => (
                  <li key={line}>・{line}</li>
                ))}
              </ul>
              {planId === 'free' ? (
                <div className="text-center text-sm text-text-secondary py-2">
                  {isCurrent ? '現在のプラン' : '有料プランの解約で戻れます'}
                </div>
              ) : (
                <PlanCheckoutButton
                  slug={slug}
                  plan={planId as Exclude<PlanId, 'free'>}
                  currentPlan={currentPlan}
                  label={isSubscriber ? 'このプランに変更' : 'このプランを申し込む'}
                  isSubscriber={isSubscriber}
                  periodEnd={periodEnd}
                />
              )}
            </Card>
          );
        })}
      </div>

      {isSubscriber && (
        <p className="mt-6 text-xs text-text-secondary leading-relaxed">
          プランを変更する場合、カード情報の再入力は不要で、その場で切り替わります。
          料金は日割りで調整され、差額（またはクレジット）は次回のご請求にまとめて反映されます。
          ご請求日は変わりません。
        </p>
      )}
      <p className="mt-3 text-xs text-text-secondary">
        プランの変更・解約・支払い方法の更新は「プラン変更・解約・支払い方法」からも行えます。
        解約すると期間満了後に Free プランへ移行します。
        {isScheduledToCancel &&
          ' 解約を取り消すと、これまで通り継続してご利用いただけます。'}
      </p>
    </div>
  );
}
