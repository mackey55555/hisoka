import { Resend } from 'resend';

/**
 * Resend 経由で招待メールを送るユーティリティ。
 *
 * 環境変数:
 *  - RESEND_API_KEY: Resend の API キー（必須）
 *  - MAIL_FROM: 送信元アドレス（必須。例: "Hisoka <noreply@hisoka.online>"）
 *  - MAIL_DEV_REDIRECT_TO: 非本番環境では送信先をこのアドレスに強制リダイレクト（誤爆防止）
 *
 * セーフティ:
 *  - 非本番環境 (VERCEL_ENV !== 'production') で MAIL_DEV_REDIRECT_TO が未設定の場合は送信を拒否する。
 *    これにより、開発中に実ユーザーへ誤爆するのを防ぐ。
 *
 * 関連: docs/mail-setup.md / docs/team-plan-bugs.md (BUG-001 / BUG-003)
 */

interface SendInvitationEmailParams {
  to: string;
  teamName: string;
  acceptUrl: string;
  expiresAt: string; // ISO8601
  role: 'admin' | 'trainer' | 'trainee';
  inviterName?: string;
}

interface SendResult {
  sent: boolean;
  redirectedTo?: string; // 実際に届けた宛先（DEV リダイレクトされた場合）
  messageId?: string;
  error?: string;
}

const roleLabels: Record<'admin' | 'trainer' | 'trainee', string> = {
  admin: '管理者',
  trainer: 'トレーナー',
  trainee: 'トレーニー',
};

export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const devRedirectTo = process.env.MAIL_DEV_REDIRECT_TO?.trim();
  const isProd = process.env.VERCEL_ENV === 'production';

  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY が未設定です' };
  }
  if (!from) {
    return { sent: false, error: 'MAIL_FROM が未設定です' };
  }

  // セーフティ: 非本番では DEV リダイレクト先が必須
  if (!isProd && !devRedirectTo) {
    return {
      sent: false,
      error:
        '非本番環境では MAIL_DEV_REDIRECT_TO を設定してください（誤爆防止）',
    };
  }

  const actualTo = !isProd && devRedirectTo ? devRedirectTo : params.to;
  const isRedirected = actualTo !== params.to;

  const subject = isRedirected
    ? `[DEV→${params.to}] 【Hisoka】${params.teamName} への招待`
    : `【Hisoka】${params.teamName} への招待`;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: actualTo,
    subject,
    html: renderHtml({ ...params, isRedirected, originalTo: params.to }),
    text: renderText({ ...params, isRedirected, originalTo: params.to }),
  });

  if (error) {
    return { sent: false, error: error.message ?? String(error) };
  }

  return {
    sent: true,
    redirectedTo: isRedirected ? actualTo : undefined,
    messageId: data?.id,
  };
}

function renderHtml(p: {
  teamName: string;
  acceptUrl: string;
  expiresAt: string;
  role: 'admin' | 'trainer' | 'trainee';
  inviterName?: string;
  isRedirected: boolean;
  originalTo: string;
}): string {
  const expiresLabel = formatDate(p.expiresAt);
  const inviter = p.inviterName ? `${escapeHtml(p.inviterName)} さんから ` : '';

  return `<!DOCTYPE html>
<html lang="ja">
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif;color:#1f2937;line-height:1.6;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      ${
        p.isRedirected
          ? `<div style="background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-size:13px;">
              <strong>[DEV モード]</strong> 本来の宛先: <code>${escapeHtml(p.originalTo)}</code><br/>
              本番では送られていないテスト送信です。
            </div>`
          : ''
      }
      <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">Hisoka へようこそ</h1>
      <p style="margin:0 0 16px;">${inviter}<strong>${escapeHtml(p.teamName)}</strong> に <strong>${roleLabels[p.role]}</strong> として招待されました。</p>
      <p style="margin:0 0 24px;">下のボタンから招待を受諾してください。</p>
      <p style="margin:0 0 32px;">
        <a href="${escapeAttr(p.acceptUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">
          招待を受諾する
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
        ボタンが押せない場合は、以下の URL をブラウザで開いてください:
      </p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
        <a href="${escapeAttr(p.acceptUrl)}" style="color:#2563eb;">${escapeHtml(p.acceptUrl)}</a>
      </p>
      <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
        この招待リンクは <strong>${expiresLabel}</strong> まで有効です。
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        このメールに心当たりがない場合は、破棄してください。送信元アドレスへの返信には対応していません。
      </p>
    </div>
  </body>
</html>`;
}

function renderText(p: {
  teamName: string;
  acceptUrl: string;
  expiresAt: string;
  role: 'admin' | 'trainer' | 'trainee';
  inviterName?: string;
  isRedirected: boolean;
  originalTo: string;
}): string {
  const expiresLabel = formatDate(p.expiresAt);
  const inviter = p.inviterName ? `${p.inviterName} さんから ` : '';
  const header = p.isRedirected
    ? `[DEV モード] 本来の宛先: ${p.originalTo}\n本番では送られていないテスト送信です。\n\n`
    : '';

  return `${header}Hisoka へようこそ

${inviter}${p.teamName} に ${roleLabels[p.role]} として招待されました。

下の URL から招待を受諾してください:
${p.acceptUrl}

この招待リンクは ${expiresLabel} まで有効です。

---
このメールに心当たりがない場合は、破棄してください。
送信元アドレスへの返信には対応していません。
`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${mm}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
