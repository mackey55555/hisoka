'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { sendPushTo, type PushSubscriptionRow } from '@/lib/push/send';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export async function subscribeToPush(
  teamSlug: string,
  input: SubscriptionInput
) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const validated = subscriptionSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { error } = await (supabase as any)
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        team_id: team.teamId,
        endpoint: validated.data.endpoint,
        p256dh: validated.data.p256dh,
        auth: validated.data.auth,
        user_agent: validated.data.userAgent ?? null,
        enabled: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    return { error: '通知の登録に失敗しました: ' + error.message };
  }

  revalidatePath(`/t/${team.slug}/me`);
  return { success: true };
}

export async function unsubscribeFromPush(teamSlug: string, endpoint: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) return { error: '解除に失敗しました' };

  revalidatePath(`/t/${team.slug}/me`);
  return { success: true };
}

export interface NotificationPreferences {
  daily_evening: boolean;
  monthly_reflection: boolean;
  streak_warning: boolean;
  trainer_message: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  daily_evening: true,
  monthly_reflection: true,
  streak_warning: true,
  trainer_message: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export async function getMyPreferences(teamSlug: string): Promise<{
  data: NotificationPreferences;
  hasSubscription: boolean;
  error: string | null;
}> {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: DEFAULT_PREFERENCES, hasSubscription: false, error: '認証が必要です' };
  }

  const [prefRes, subRes] = await Promise.all([
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('team_id', team.teamId)
      .maybeSingle(),
    supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', team.teamId)
      .eq('enabled', true)
      .limit(1),
  ]);

  const prefData = (prefRes.data as NotificationPreferences | null) ?? DEFAULT_PREFERENCES;
  const hasSubscription = (subRes.data?.length ?? 0) > 0;

  return { data: prefData, hasSubscription, error: null };
}

const updatePreferencesSchema = z.object({
  daily_evening: z.boolean(),
  monthly_reflection: z.boolean(),
  streak_warning: z.boolean(),
  trainer_message: z.boolean(),
  quiet_hours_start: z.number().int().min(0).max(23).nullable(),
  quiet_hours_end: z.number().int().min(0).max(23).nullable(),
});

export async function sendTestNotification(teamSlug: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.id)
    .eq('team_id', team.teamId)
    .eq('enabled', true);

  const subscriptions = (subs as PushSubscriptionRow[] | null) || [];
  if (subscriptions.length === 0) {
    return { error: '有効な subscription がありません。先に通知を有効化してください。' };
  }

  const payload = {
    title: 'Hisoka からのテスト通知',
    body: '通知が正常に届いています。',
    url: `/t/${team.slug}/me`,
    tag: 'hisoka-test',
  };

  const admin = getAdminClient();
  let sent = 0;
  let failed = 0;
  let expired = 0;

  for (const sub of subscriptions) {
    const result = await sendPushTo(sub, payload);

    await (admin as any).from('notification_deliveries').insert({
      user_id: user.id,
      subscription_id: sub.id,
      kind: 'test',
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

  return { success: true, sent, failed, expired, total: subscriptions.length };
}

export async function updateMyPreferences(
  teamSlug: string,
  input: NotificationPreferences
) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const validated = updatePreferencesSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { error } = await (supabase as any)
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        team_id: team.teamId,
        ...validated.data,
      },
      { onConflict: 'user_id,team_id' }
    );

  if (error) {
    return { error: '設定の保存に失敗しました: ' + error.message };
  }

  revalidatePath(`/t/${team.slug}/me`);
  return { success: true };
}
