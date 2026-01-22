'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const goalSchema = z.object({
  content: z.string().min(1, '目標内容を入力してください'),
  deadline: z.string().min(1, '期限を選択してください'),
  status: z.enum(['in_progress', 'achieved', 'cancelled']).optional(),
});

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  const rawData = {
    content: formData.get('content') as string,
    deadline: formData.get('deadline') as string,
  };

  const validated = goalSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      content: validated.data.content,
      deadline: validated.data.deadline,
      status: 'in_progress',
    } as any);

  if (error) {
    return { error: '目標の作成に失敗しました' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/goals');
  return { success: true };
}

export async function updateGoal(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  const rawData = {
    content: formData.get('content') as string,
    deadline: formData.get('deadline') as string,
    status: formData.get('status') as string,
  };

  const validated = goalSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { error } = await (supabase as any)
    .from('goals')
    .update({
      content: validated.data.content,
      deadline: validated.data.deadline,
      status: (validated.data.status || 'in_progress') as 'in_progress' | 'achieved' | 'cancelled',
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: '目標の更新に失敗しました' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/goals/${id}`);
  return { success: true };
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証が必要です' };
  }

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: '目標の削除に失敗しました' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/goals');
  return { success: true };
}

export async function getGoals() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: '目標の取得に失敗しました' };
  }

  return { data, error: null };
}

export async function getGoalById(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return { data: null, error: '目標の取得に失敗しました' };
  }

  return { data, error: null };
}

