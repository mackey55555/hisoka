'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const reflectionSchema = z.object({
  activity_id: z.string().min(1, '活動記録を選択してください'),
  content: z.string().min(1, '振り返り内容を入力してください'),
});

export async function createReflection(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  const rawData = {
    activity_id: formData.get('activity_id') as string,
    content: formData.get('content') as string,
  };

  const validated = reflectionSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  // 活動記録がユーザーのものか確認（目標経由）
  const { data: activity } = await supabase
    .from('activities')
    .select('id, goal_id, goals!inner(user_id)')
    .eq('id', validated.data.activity_id)
    .single();

  if (!activity || (activity as any).goals.user_id !== user.id) {
    return { error: '活動記録が見つかりません' };
  }

  const { error } = await supabase
    .from('reflections')
    .insert({
      activity_id: validated.data.activity_id,
      content: validated.data.content,
    } as any);

  if (error) {
    return { error: '振り返りの作成に失敗しました' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/goals/${(activity as any).goal_id}`);
  return { success: true };
}

export async function updateReflection(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  const content = formData.get('content') as string;
  if (!content || content.trim().length === 0) {
    return { error: '振り返り内容を入力してください' };
  }

  // 振り返りがユーザーのものか確認（活動記録→目標経由）
  const { data: reflection } = await supabase
    .from('reflections')
    .select('activity_id, activities!inner(goal_id, goals!inner(user_id))')
    .eq('id', id)
    .single();

  if (!reflection || (reflection as any).activities.goals.user_id !== user.id) {
    return { error: '振り返りが見つかりません' };
  }

  const { error } = await (supabase as any)
    .from('reflections')
    .update({ content })
    .eq('id', id);

  if (error) {
    return { error: '振り返りの更新に失敗しました' };
  }

  const activity = (reflection as any).activities;
  revalidatePath('/dashboard');
  revalidatePath(`/goals/${activity.goal_id}`);
  return { success: true };
}

export async function deleteReflection(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  // 振り返りがユーザーのものか確認（活動記録→目標経由）
  const { data: reflection } = await supabase
    .from('reflections')
    .select('activity_id, activities!inner(goal_id, goals!inner(user_id))')
    .eq('id', id)
    .single();

  if (!reflection || (reflection as any).activities.goals.user_id !== user.id) {
    return { error: '振り返りが見つかりません' };
  }

  const { error } = await supabase
    .from('reflections')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: '振り返りの削除に失敗しました' };
  }

  const activity = (reflection as any).activities;
  revalidatePath('/dashboard');
  revalidatePath(`/goals/${activity.goal_id}`);
  return { success: true };
}

export async function getReflectionsByActivityId(activityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: '振り返りの取得に失敗しました' };
  }

  return { data, error: null };
}

export async function getReflectionsByActivityIds(activityIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  if (activityIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .in('activity_id', activityIds)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: '振り返りの取得に失敗しました' };
  }

  return { data: data || [], error: null };
}
