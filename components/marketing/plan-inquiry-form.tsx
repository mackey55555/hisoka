'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { submitPlanInquiry } from '@/lib/actions/inquiries';
import { PLANS, PLAN_ORDER } from '@/lib/plan/plans';

type InquiryPlan = 'free' | 'starter' | 'pro' | 'enterprise';

const VALID_PLANS: InquiryPlan[] = ['free', 'starter', 'pro', 'enterprise'];

export function PlanInquiryForm() {
  const [plan, setPlan] = useState<InquiryPlan>('starter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 各プランカードの「このプランで申し込む」から希望プランを受け取る
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as InquiryPlan;
      if (VALID_PLANS.includes(detail)) setPlan(detail);
    };
    window.addEventListener('hisoka:select-plan', handler);
    return () => window.removeEventListener('hisoka:select-plan', handler);
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const memberRaw = String(fd.get('memberCount') || '').trim();
    const res = await submitPlanInquiry({
      plan,
      company: String(fd.get('company') || ''),
      contactName: String(fd.get('contactName') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      memberCount: memberRaw ? Number(memberRaw) : undefined,
      message: String(fd.get('message') || ''),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <h3 className="text-xl font-bold text-primary mb-2">お申し込みを受け付けました</h3>
        <p className="text-text-secondary leading-relaxed">
          担当者より折り返しご連絡いたします。少々お待ちください。
        </p>
      </div>
    );
  }

  const labelCls = 'block text-sm font-medium text-text-primary mb-1.5';
  const inputCls =
    'w-full px-3 py-2 text-base bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface p-6 md:p-8 space-y-5">
      <div>
        <label className={labelCls}>希望プラン</label>
        <div className="flex flex-wrap gap-2">
          {PLAN_ORDER.map((id) => (
            <button
              type="button"
              key={id}
              onClick={() => setPlan(id)}
              className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${
                plan === id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-text-primary border-border hover:border-primary/50'
              }`}
            >
              {PLANS[id].label}
              <span className="ml-1 text-sm opacity-80">
                ¥{PLANS[id].priceJpy.toLocaleString()}/月・{PLANS[id].maxMembers}名
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPlan('enterprise')}
            className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${
              plan === 'enterprise'
                ? 'bg-primary text-white border-primary'
                : 'bg-background text-text-primary border-border hover:border-primary/50'
            }`}
          >
            それ以上
            <span className="ml-1 text-sm opacity-80">31名〜・お問い合わせ</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="company">会社/団体名 *</label>
          <input id="company" name="company" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="contactName">お名前 *</label>
          <input id="contactName" name="contactName" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">メールアドレス *</label>
          <input id="email" name="email" type="email" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="phone">電話番号（任意）</label>
          <input id="phone" name="phone" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="memberCount">想定メンバー数（任意）</label>
          <input id="memberCount" name="memberCount" type="number" min={1} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="message">ご相談・ご質問（任意）</label>
        <textarea id="message" name="message" rows={4} className={`${inputCls} resize-y`} />
      </div>

      {error && <p className="text-error text-base">{error}</p>}

      <Button type="submit" variant="primary" disabled={loading} className="px-8 py-3 text-base">
        {loading ? '送信中…' : 'この内容で申し込む'}
      </Button>
      <p className="text-sm text-text-secondary">
        送信後、担当者より折り返しご連絡します。その場で料金は発生しません。
      </p>
    </form>
  );
}
