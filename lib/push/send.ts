// Web Push 送信ユーティリティ。
// VAPID 設定の初期化と、subscription への送信を1関数にまとめる。

import webpush from 'web-push';

let initialized = false;

function ensureVapid() {
  if (initialized) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      'VAPID 環境変数が設定されていません (VAPID_SUBJECT / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)'
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

export interface SendResult {
  ok: boolean;
  /** Push Service から 404/410 が返り、subscription が無効化されている */
  gone: boolean;
  statusCode?: number;
  error?: string;
}

export async function sendPushTo(
  sub: PushSubscriptionRow,
  payload: PushPayload
): Promise<SendResult> {
  ensureVapid();

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true, gone: false };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    const statusCode = e?.statusCode;
    const gone = statusCode === 404 || statusCode === 410;
    return {
      ok: false,
      gone,
      statusCode,
      error: e?.message || String(err),
    };
  }
}
