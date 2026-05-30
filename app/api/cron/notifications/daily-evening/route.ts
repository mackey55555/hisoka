import { getAdminClient } from '@/lib/supabase/admin';
import { sendPushTo, type PushSubscriptionRow } from '@/lib/push/send';

export const maxDuration = 60;

interface PreferenceRow {
  user_id: string;
  team_id: string;
  daily_evening: boolean;
}

interface SubRow extends PushSubscriptionRow {
  user_id: string;
  team_id: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  // 1. 有効な subscription を全件取得
  const { data: subsRaw, error: subErr } = await admin
    .from('push_subscriptions')
    .select('id, user_id, team_id, endpoint, p256dh, auth')
    .eq('enabled', true);

  if (subErr) {
    return Response.json({ error: subErr.message }, { status: 500 });
  }

  const subs = (subsRaw as SubRow[]) || [];
  if (subs.length === 0) {
    return Response.json({ eligible: 0, sent: 0, message: '対象なし' });
  }

  // 2. これらのユーザーの preferences を取得（無ければデフォルト ON）
  const userIds = Array.from(new Set(subs.map((s) => s.user_id)));
  const { data: prefsRaw } = await admin
    .from('notification_preferences')
    .select('user_id, team_id, daily_evening')
    .in('user_id', userIds);

  const prefs = (prefsRaw as PreferenceRow[]) || [];
  const prefMap = new Map<string, boolean>(
    prefs.map((p) => [`${p.user_id}:${p.team_id}`, p.daily_evening])
  );

  // 3. daily_evening が ON (or 未設定でデフォルト ON) の subscription だけ残す
  const eligible = subs.filter((s) => {
    const pref = prefMap.get(`${s.user_id}:${s.team_id}`);
    return pref === undefined || pref === true;
  });

  if (eligible.length === 0) {
    return Response.json({ eligible: 0, sent: 0, message: 'daily_evening ON のユーザーなし' });
  }

  // 4. 送信
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    title: 'Hisoka',
    body: '今日もお疲れさまでした。今日やったことを記録しませんか？',
    url: '/',
    tag: `hisoka-daily-${today}`,
  };

  let sent = 0;
  let failed = 0;
  let expired = 0;

  for (const sub of eligible) {
    const result = await sendPushTo(sub, payload);

    await (admin as any).from('notification_deliveries').insert({
      user_id: sub.user_id,
      subscription_id: sub.id,
      kind: 'daily_evening',
      status: result.ok ? 'sent' : result.gone ? 'expired' : 'failed',
      payload,
      error: result.ok ? null : result.error,
    });

    if (result.ok) {
      sent++;
    } else if (result.gone) {
      expired++;
      await (admin as any)
        .from('push_subscriptions')
        .update({ enabled: false })
        .eq('id', sub.id);
    } else {
      failed++;
    }
  }

  return Response.json({
    eligible: eligible.length,
    sent,
    failed,
    expired,
  });
}
