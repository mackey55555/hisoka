import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { PLANS, PLAN_ORDER, historyLabel, type PlanConfig } from '@/lib/plan/plans';
import { PlanInquiryForm } from '@/components/marketing/plan-inquiry-form';
import { ApplyCtaButton } from '@/components/marketing/apply-cta-button';

export const metadata: Metadata = {
  title: '料金プラン - Hisoka（密か）',
  description:
    'Hisoka の料金プラン比較。Free / Starter / Pro の月額・メンバー上限・AI機能を横並びで比較し、お申し込みいただけます。',
};

function yes() {
  return <span className="text-primary font-bold" aria-label="対応">◯</span>;
}
function no() {
  return <span className="text-text-secondary/50" aria-label="非対応">×</span>;
}

/** プランごとの機能行（plans.ts から生成） */
function featureRows(c: PlanConfig): { label: string; value: React.ReactNode }[] {
  return [
    { label: '月額（税込・チーム単位）', value: <span className="font-bold text-text-primary">¥{c.priceJpy.toLocaleString()}</span> },
    { label: 'メンバー上限', value: `${c.maxMembers}名` },
    { label: '過去データ閲覧', value: historyLabel(c.id) },
    { label: '目標・活動・振り返り（コア）', value: c.features.core ? yes() : no() },
    { label: '通知（Push）', value: c.features.notifications ? yes() : no() },
    { label: 'AI月次診断', value: c.features.monthlyDiagnosis ? yes() : no() },
    { label: 'AI質問サジェスト', value: c.features.questionSuggest ? yes() : no() },
    { label: 'AI振り返りサポート', value: c.features.reflectionSupport ? yes() : no() },
    { label: 'エクスポート（PDF / CSV）', value: c.features.export ? yes() : no() },
  ];
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">Hisoka</Link>
          <Link href="/login">
            <Button variant="secondary" className="px-5 py-2 text-sm">ログイン</Button>
          </Link>
        </div>
      </header>

      {/* 見出し */}
      <section className="container mx-auto px-4 pt-14 pb-8 text-center max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary">料金プラン</h1>
        <p className="mt-4 text-base md:text-lg text-text-secondary leading-relaxed">
          チーム単位の月額制。まずは Free から、必要に応じて上位プランへ。
          お申し込みは下のフォームから、担当者がチームを開設します。
        </p>
      </section>

      {/* プラン横並び */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto items-start">
          {PLAN_ORDER.map((id) => {
            const c = PLANS[id];
            const featured = id === 'starter';
            return (
              <div
                key={id}
                className={`rounded-2xl border bg-surface p-7 shadow-sm flex flex-col ${
                  featured ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-primary">{c.label}</h2>
                  {featured && (
                    <span className="rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
                      おすすめ
                    </span>
                  )}
                </div>
                <p className="mt-4">
                  <span className="text-3xl font-bold text-text-primary">¥{c.priceJpy.toLocaleString()}</span>
                  <span className="text-base text-text-secondary"> / 月</span>
                </p>
                <p className="mt-1 text-sm text-text-secondary">メンバー最大 {c.maxMembers}名</p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {featureRows(c).slice(3).map((r) => (
                    <li key={r.label} className="flex items-center justify-between gap-2 text-base">
                      <span className="text-text-secondary">{r.label}</span>
                      <span>{r.value}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <ApplyCtaButton plan={id} variant={featured ? 'primary' : 'secondary'} />
                </div>

                {/* 閲覧できる期間（申し込むボタンの下に表示。Free=制限 / Starter・Pro=無制限） */}
                <div className="mt-3 rounded-lg bg-background px-3 py-2">
                  <p className="text-sm">
                    <span className="text-text-secondary">閲覧できる期間：</span>
                    <span className={`font-medium ${c.id === 'free' ? 'text-warning' : 'text-primary'}`}>
                      {historyLabel(c.id)}
                    </span>
                  </p>
                  {c.id === 'free' && (
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                      ※お試し用に閲覧期間を制限しています（データは保持され、上位プランへ移行することで全期間ご覧いただけます）。
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* それ以上（お問い合わせ） */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto rounded-2xl border border-border bg-surface p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary">31名以上・大規模導入をご検討の方へ</h3>
            <p className="mt-1 text-base text-text-secondary">
              人数や運用に合わせて個別にご案内します。まずはお気軽にお問い合わせください。
            </p>
          </div>
          <div className="shrink-0 w-full md:w-auto">
            <ApplyCtaButton
              plan="enterprise"
              variant="secondary"
              label="お問い合わせ"
              className="px-8 py-3 text-base w-full md:w-auto"
            />
          </div>
        </div>
      </section>

      {/* 申し込みフォーム */}
      <section id="apply" className="bg-surface border-t border-border scroll-mt-4">
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">お申し込み・ご相談</h2>
            <p className="mt-3 text-text-secondary leading-relaxed">
              内容を確認のうえ、担当者よりご連絡します。人数や運用のご相談だけでも歓迎です。
            </p>
          </div>
          <PlanInquiryForm />
        </div>
      </section>

      <footer className="bg-background border-t border-border">
        <div className="container mx-auto px-4 py-8 flex items-center justify-between text-sm text-text-secondary">
          <Link href="/" className="font-bold text-primary">Hisoka</Link>
          <span>© 2026 Hisoka</span>
        </div>
      </footer>
    </div>
  );
}
