'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { selectPlan, createPortalSession } from '@/lib/actions/billing';
import { PLANS, PLAN_ORDER, type PlanId } from '@/lib/plan/plans';

/**
 * 既存契約者がプラン変更する際に、何が起きるかを平易に伝える確認文。
 * アップグレード/ダウングレードで内容を出し分ける(計算式は載せない)。
 */
function changeConfirmMessage(
  currentPlan: PlanId,
  plan: Exclude<PlanId, 'free'>,
  periodEnd: string | null
): string {
  const fromLabel = PLANS[currentPlan].label;
  const toLabel = PLANS[plan].label;
  const isUpgrade = PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(currentPlan);
  const nextBilling = periodEnd ? `次回のご請求（${periodEnd}）` : '次回のご請求';

  const common =
    `・カード情報の再入力は必要ありません\n` + `・ご請求日は変わりません`;

  if (isUpgrade) {
    return (
      `${fromLabel} から ${toLabel} に変更します。\n\n` +
      `・すぐに ${toLabel} の機能が使えるようになります\n` +
      `・差額は日割りで計算され、${nextBilling}にまとめて反映されます（いますぐカードに請求されることはありません）\n` +
      `${common}\n\n` +
      `変更してよろしいですか？`
    );
  }
  return (
    `${fromLabel} から ${toLabel} に変更します。\n\n` +
    `・すぐに ${toLabel} に切り替わります\n` +
    `・使っていない期間分は日割りでクレジットされ、${nextBilling}から差し引かれます（いますぐの返金ではありません）\n` +
    `${common}\n\n` +
    `変更してよろしいですか？`
  );
}

/** 有料プランの申込 / 変更ボタン。 */
export function PlanCheckoutButton({
  slug,
  plan,
  currentPlan,
  label,
  isSubscriber,
  periodEnd,
}: {
  slug: string;
  plan: Exclude<PlanId, 'free'>;
  currentPlan: PlanId;
  label: string;
  /** 既にアクティブなサブスクを持っているか(=その場変更・日割りになる) */
  isSubscriber: boolean;
  periodEnd: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (currentPlan === plan) {
    return (
      <Button variant="secondary" disabled className="w-full">
        現在のプラン
      </Button>
    );
  }

  const onClick = async () => {
    // 既存契約者の変更時のみ、日割りの説明を出して確認をとる。
    // 新規申込は次の Checkout 画面で金額が提示されるため確認は挟まない。
    if (isSubscriber) {
      const ok = window.confirm(changeConfirmMessage(currentPlan, plan, periodEnd));
      if (!ok) return;
    }

    setLoading(true);
    try {
      const res = await selectPlan(slug, plan);
      if (res.error) {
        alert(res.error);
        setLoading(false);
        return;
      }
      if (res.url) {
        // 新規申込 → Checkout へ
        window.location.href = res.url;
        return;
      }
      if (res.changed) {
        // 既存サブスクをその場で変更 → 反映を数秒待って再読込
        alert('プランを変更しました。反映まで数秒かかることがあります。');
        router.refresh();
        setLoading(false);
      }
    } catch (e: any) {
      alert(e?.message ?? '処理に失敗しました');
      setLoading(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={loading} className="w-full">
      {loading ? '処理中…' : label}
    </Button>
  );
}

/** Stripe Customer Portal(プラン変更・解約・支払い方法)へ遷移。 */
export function ManagePortalButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await createPortalSession(slug);
      if (res.error) {
        alert(res.error);
        setLoading(false);
        return;
      }
      if (res.url) window.location.href = res.url;
    } catch (e: any) {
      alert(e?.message ?? '処理に失敗しました');
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" onClick={onClick} disabled={loading}>
      {loading ? '処理中…' : 'プラン変更・解約・支払い方法'}
    </Button>
  );
}
