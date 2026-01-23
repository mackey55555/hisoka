'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createAdminClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function signUp(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return { error: 'すべての項目を入力してください' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Adminクライアントを使用してAuthユーザーを作成
  const adminSupabase = getAdminClient();

  // 1. Authユーザーを作成
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError || !authData.user) {
    return { error: '登録に失敗しました。' + (authError?.message || 'Unknown error') };
  }

  // 2. ロールを取得（trainee）
  const { data: roles } = await adminSupabase
    .from('roles')
    .select('id')
    .eq('name', 'trainee')
    .single();

  if (!roles) {
    return { error: 'ロールの取得に失敗しました' };
  }

  // 3. usersテーブルに追加（AdminクライアントなのでRLSをバイパス）
  const { error: userError } = await adminSupabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: normalizedEmail,
      name,
      role_id: roles.id,
    });

  if (userError) {
    return { error: 'ユーザー情報の登録に失敗しました: ' + userError.message };
  }

  revalidatePath('/dashboard');
  return { success: true, userId: authData.user.id };
}

