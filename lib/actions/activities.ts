'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const activitySchema = z.object({
  goal_id: z.string().min(1, '目標を選択してください'),
  content: z.string().min(1, '活動内容を入力してください'),
});

export async function createActivity(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  const rawData = {
    goal_id: formData.get('goal_id') as string,
    content: formData.get('content') as string,
  };

  const validated = activitySchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  // 目標がユーザーのものか確認
  const { data: goal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', validated.data.goal_id)
    .eq('user_id', user.id)
    .single();

  if (!goal) {
    return { error: '目標が見つかりません' };
  }

  const { error } = await supabase
    .from('activities')
    .insert([
      {
        goal_id: validated.data.goal_id,
        content: validated.data.content,
      },
    ] as any);

  if (error) {
    return { error: '活動記録の作成に失敗しました' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/goals/${validated.data.goal_id}`);
  return { success: true };
}

export async function updateActivity(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  const content = formData.get('content') as string;
  if (!content || content.trim().length === 0) {
    return { error: '活動内容を入力してください' };
  }

  // 活動記録がユーザーのものか確認（目標経由）
  const { data: activity } = await supabase
    .from('activities')
    .select('goal_id, goals!inner(user_id)')
    .eq('id', id)
    .single();

  const activityTyped = activity as { goal_id: string; goals: { user_id: string } } | null;
  if (!activityTyped || activityTyped.goals.user_id !== user.id) {
    return { error: '活動記録が見つかりません' };
  }

  // 新しいクライアントを使用して型エラーを回避
  const supabaseForUpdate = await createClient();
  const { error } = await (supabaseForUpdate as any)
    .from('activities')
    .update({ content: content.trim() })
    .eq('id', id);

  if (error) {
    return { error: '活動記録の更新に失敗しました' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/goals/${activityTyped.goal_id}`);
  return { success: true };
}

export async function deleteActivity(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  // 活動記録がユーザーのものか確認（目標経由）
  const { data: activity } = await supabase
    .from('activities')
    .select('goal_id, goals!inner(user_id)')
    .eq('id', id)
    .single();

  const activityTyped = activity as { goal_id: string; goals: { user_id: string } } | null;
  if (!activityTyped || activityTyped.goals.user_id !== user.id) {
    return { error: '活動記録が見つかりません' };
  }

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: '活動記録の削除に失敗しました' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/goals/${activityTyped.goal_id}`);
  return { success: true };
}

export async function getActivitiesByGoalId(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: '活動記録の取得に失敗しました' };
  }

  return { data, error: null };
}

