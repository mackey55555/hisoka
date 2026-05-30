'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import type { MonthlyReflection } from '@/types';

const contentSchema = z.object({
  content: z
    .string()
    .min(1, '内容を入力してください')
    .max(10000, '長すぎます（10,000文字以内）'),
});

export async function getMyMonthlyReflection(
  teamSlug: string,
  year: number,
  month: number
) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: '認証が必要です' };

  const { data, error } = await supabase
    .from('monthly_reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_id', team.teamId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) return { data: null, error: '振り返りの取得に失敗しました' };
  return { data: (data as MonthlyReflection | null) ?? null, error: null };
}

export async function getMyMonthlyReflectionHistory(teamSlug: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: '認証が必要です' };

  const { data, error } = await supabase
    .from('monthly_reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_id', team.teamId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) return { data: [], error: '振り返り履歴の取得に失敗しました' };
  return { data: (data as MonthlyReflection[]) ?? [], error: null };
}

export async function upsertMyMonthlyReflection(
  teamSlug: string,
  year: number,
  month: number,
  formData: FormData
) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const validated = contentSchema.safeParse({
    content: formData.get('content') as string,
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  if (month < 1 || month > 12) return { error: '月の指定が不正です' };

  const { error } = await (supabase as any)
    .from('monthly_reflections')
    .upsert(
      {
        user_id: user.id,
        team_id: team.teamId,
        year,
        month,
        content: validated.data.content,
      },
      { onConflict: 'user_id,team_id,year,month' }
    );

  if (error) return { error: '振り返りの保存に失敗しました' };

  revalidatePath(`/t/${team.slug}/dashboard`);
  return { success: true };
}

export async function deleteMyMonthlyReflection(
  teamSlug: string,
  year: number,
  month: number
) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const { error } = await supabase
    .from('monthly_reflections')
    .delete()
    .eq('user_id', user.id)
    .eq('team_id', team.teamId)
    .eq('year', year)
    .eq('month', month);

  if (error) return { error: '削除に失敗しました' };

  revalidatePath(`/t/${team.slug}/dashboard`);
  return { success: true };
}
