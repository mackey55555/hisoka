'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolveTeamFromSlug } from '@/lib/context/current-team';

const nameSchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(100, '100文字以内で入力してください'),
});

const emailSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(72, 'パスワードは72文字以内で入力してください'),
});

export async function updateMyName(teamSlug: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const validated = nameSchema.safeParse({
    name: formData.get('name') as string,
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const { error: dbError } = await (supabase as any)
    .from('users')
    .update({ name: validated.data.name })
    .eq('id', user.id);
  if (dbError) return { error: '名前の更新に失敗しました' };

  await supabase.auth.updateUser({
    data: { name: validated.data.name },
  });

  const team = await resolveTeamFromSlug(teamSlug);
  revalidatePath(`/t/${team.slug}/me`);
  revalidatePath(`/t/${team.slug}/dashboard`);
  return { success: true };
}

export async function requestEmailChange(_teamSlug: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const validated = emailSchema.safeParse({
    email: formData.get('email') as string,
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const newEmail = validated.data.email.trim().toLowerCase();
  if (newEmail === user.email?.toLowerCase()) {
    return { error: '現在のメールアドレスと同じです' };
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    return {
      error:
        'メールアドレスの変更リクエストに失敗しました: ' + error.message,
    };
  }

  return { success: true, pendingEmail: newEmail };
}

export async function updateMyPassword(_teamSlug: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

  const password = (formData.get('password') as string) ?? '';
  const confirm = (formData.get('confirm') as string) ?? '';

  if (password !== confirm) {
    return { error: 'パスワードが一致しません' };
  }

  const validated = passwordSchema.safeParse({ password });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  });
  if (error) {
    return { error: 'パスワード更新に失敗しました: ' + error.message };
  }

  return { success: true };
}

export async function syncMyEmailFromAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: '認証が必要です' };

  const admin = getAdminClient();
  const { error } = await (admin as any)
    .from('users')
    .update({ email: user.email.trim().toLowerCase() })
    .eq('id', user.id);
  if (error) return { error: '同期に失敗しました' };
  return { success: true };
}
