'use server';

import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendPlanInquiryEmail } from '@/lib/mail';

/** enterprise = Pro の人数上限を超える「お問い合わせ」区分（実プランではない） */
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'それ以上（お問い合わせ）',
};

const inquirySchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
  company: z.string().trim().min(1, '会社/団体名を入力してください').max(200),
  contactName: z.string().trim().min(1, 'お名前を入力してください').max(100),
  email: z.string().trim().email('有効なメールアドレスを入力してください'),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  memberCount: z.coerce.number().int().min(1).max(100000).optional(),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type InquiryInput = z.input<typeof inquirySchema>;

/**
 * プラン申し込み/問い合わせを受け付ける（公開・未認証）。
 * DB へ保存し、運営へメール通知する。書き込みは service key で行う。
 */
export async function submitPlanInquiry(
  raw: InquiryInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '入力内容をご確認ください' };
  }
  const d = parsed.data;

  try {
    const admin = getAdminClient();
    const { error: insertError } = await admin.from('plan_inquiries').insert({
      plan: d.plan,
      company: d.company,
      contact_name: d.contactName,
      email: d.email,
      phone: d.phone || null,
      member_count: d.memberCount ?? null,
      message: d.message || null,
    } as any);

    if (insertError) {
      console.error('plan_inquiries insert error:', insertError);
      return { ok: false, error: '送信に失敗しました。時間をおいて再度お試しください。' };
    }

    // 通知メール（失敗しても申し込み自体は保存済みなので成功扱いにする）
    const planLabel = PLAN_LABELS[d.plan] ?? d.plan;
    const mail = await sendPlanInquiryEmail({
      planLabel,
      company: d.company,
      contactName: d.contactName,
      email: d.email,
      phone: d.phone || undefined,
      memberCount: d.memberCount,
      message: d.message || undefined,
    });
    if (!mail.sent) {
      console.error('plan inquiry mail failed:', mail.error);
    }

    return { ok: true };
  } catch (e) {
    console.error('submitPlanInquiry error:', e);
    return { ok: false, error: '送信に失敗しました。時間をおいて再度お試しください。' };
  }
}
