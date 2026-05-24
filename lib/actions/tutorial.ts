'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { resolveTeamFromSlug } from '@/lib/context/current-team';

// チュートリアル専用の create アクション。
// 既存の actions と違って ID を返すため、ウィザード内でステップを連鎖できる。
// キャンセル時は cancelTutorial で goal を消せば activities/reflections は CASCADE で消える。

const goalSchema = z.object({
  content: z.string().min(1, '目標内容を入力してください'),
  deadline: z.string().min(1, '期限を選択してください'),
});

const activitySchema = z.object({
  goal_id: z.string().uuid('目標が不正です'),
  content: z.string().min(1, '活動内容を入力してください'),
});

const reflectionSchema = z.object({
  activity_id: z.string().uuid('活動が不正です'),
  content: z.string().min(1, '振り返り内容を入力してください'),
});

export async function createTutorialGoal(
  teamSlug: string,
  input: { content: string; deadline: string }
): Promise<{ goalId?: string; error?: string }> {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { data, error } = await (supabase as any)
    .from('goals')
    .insert({
      user_id: user.id,
      team_id: team.teamId,
      content: parsed.data.content,
      deadline: parsed.data.deadline,
      status: 'in_progress',
    })
    .select('id')
    .single();

  if (error || !data) return { error: '目標の作成に失敗しました' };

  revalidatePath(`/t/${team.slug}/dashboard`);
  return { goalId: (data as { id: string }).id };
}

export async function createTutorialActivity(
  teamSlug: string,
  input: { goalId: string; content: string }
): Promise<{ activityId?: string; error?: string }> {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const parsed = activitySchema.safeParse({
    goal_id: input.goalId,
    content: input.content,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // 目標がユーザーのものか確認
  const { data: goal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', parsed.data.goal_id)
    .eq('team_id', team.teamId)
    .eq('user_id', user.id)
    .single();
  if (!goal) return { error: '目標が見つかりません' };

  const { data, error } = await (supabase as any)
    .from('activities')
    .insert({
      goal_id: parsed.data.goal_id,
      content: parsed.data.content,
    })
    .select('id')
    .single();

  if (error || !data) return { error: '活動記録の作成に失敗しました' };

  revalidatePath(`/t/${team.slug}/dashboard`);
  return { activityId: (data as { id: string }).id };
}

export async function createTutorialReflection(
  teamSlug: string,
  input: { activityId: string; content: string }
): Promise<{ reflectionId?: string; error?: string }> {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const parsed = reflectionSchema.safeParse({
    activity_id: input.activityId,
    content: input.content,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // 活動が自分の目標に紐づくか確認
  const { data: activity } = await supabase
    .from('activities')
    .select('id, team_id, goals!inner(user_id)')
    .eq('id', parsed.data.activity_id)
    .single();
  const a = activity as
    | { id: string; team_id: string; goals: { user_id: string } }
    | null;
  if (!a || a.goals.user_id !== user.id || a.team_id !== team.teamId) {
    return { error: '活動記録が見つかりません' };
  }

  const { data, error } = await (supabase as any)
    .from('reflections')
    .insert({
      activity_id: parsed.data.activity_id,
      content: parsed.data.content,
    })
    .select('id')
    .single();

  if (error || !data) return { error: '振り返りの作成に失敗しました' };

  revalidatePath(`/t/${team.slug}/dashboard`);
  return { reflectionId: (data as { id: string }).id };
}

// チュートリアル中断時に途中まで作ったデータを巻き戻す。
// goal を消せば activities / reflections は ON DELETE CASCADE で連鎖削除される。
export async function cancelTutorial(
  teamSlug: string,
  input: { goalId?: string | null }
): Promise<{ success?: true; error?: string }> {
  if (!input.goalId) return { success: true };

  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', input.goalId)
    .eq('team_id', team.teamId)
    .eq('user_id', user.id);

  if (error) return { error: 'データの巻き戻しに失敗しました' };

  revalidatePath(`/t/${team.slug}/dashboard`);
  return { success: true };
}

// チュートリアルを 1 回触れたフラグを立てる。
// 完了でも途中スキップでも呼ばれて、以降ダッシュボードのバナーが消える。
export async function markTutorialCompleted(
  teamSlug: string
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const { error } = await (supabase as any)
    .from('users')
    .update({ tutorial_completed_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { error: 'フラグの保存に失敗しました' };

  revalidatePath(`/t/${teamSlug}/dashboard`);
  return { success: true };
}
