'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// 管理者用のSupabaseクライアント（サービスロールキー使用）
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is required for admin operations');
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const createUserSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  role: z.enum(['admin', 'trainer', 'trainee']),
});

export async function createUser(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    role: formData.get('role') as string,
  };

  const validated = createUserSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const supabase = getAdminClient();

  try {
    // 1. Authユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: validated.data.email.trim().toLowerCase(),
      password: validated.data.password,
      email_confirm: true,
      user_metadata: { name: validated.data.name },
    });

    if (authError || !authData.user) {
      return { error: 'ユーザー作成に失敗しました: ' + (authError?.message || 'Unknown error') };
    }

    // 2. ロールIDを取得
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', validated.data.role)
      .single();

    if (!roleData) {
      return { error: 'ロールが見つかりません' };
    }

    // 3. usersテーブルに追加
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: validated.data.email.trim().toLowerCase(),
        name: validated.data.name,
        role_id: roleData.id,
      });

    if (userError) {
      return { error: 'ユーザー情報の登録に失敗しました: ' + userError.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    return { error: 'エラーが発生しました: ' + (error.message || 'Unknown error') };
  }
}

const updateUserSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  role: z.enum(['admin', 'trainer', 'trainee']),
});

export async function updateUser(userId: string, formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    role: formData.get('role') as string,
    password: formData.get('password') as string | null,
  };

  const validated = updateUserSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const supabase = getAdminClient();

  try {
    // ロールIDを取得
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', validated.data.role)
      .single();

    if (!roleData) {
      return { error: 'ロールが見つかりません' };
    }

    // usersテーブルを更新
    const { error: userError } = await supabase
      .from('users')
      .update({
        name: validated.data.name,
        email: validated.data.email.trim().toLowerCase(),
        role_id: roleData.id,
      })
      .eq('id', userId);

    if (userError) {
      return { error: 'ユーザー情報の更新に失敗しました: ' + userError.message };
    }

    // Authユーザーを更新（メールアドレス、パスワード、メタデータ）
    const updateData: any = {
      email: validated.data.email.trim().toLowerCase(),
      user_metadata: { name: validated.data.name },
    };

    // パスワードが入力されている場合のみ更新
    if (rawData.password && rawData.password.trim().length >= 8) {
      updateData.password = rawData.password;
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(userId, updateData);

    if (authError) {
      // Authの更新に失敗してもusersテーブルの更新は成功しているので警告のみ
      console.warn('Authユーザーの更新に失敗しました:', authError.message);
      if (rawData.password) {
        return { error: 'パスワードの更新に失敗しました: ' + authError.message };
      }
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    return { error: 'エラーが発生しました: ' + (error.message || 'Unknown error') };
  }
}

export async function deleteUser(userId: string) {
  const supabase = getAdminClient();

  try {
    // Authユーザーを削除（CASCADEでusersテーブルも自動削除される）
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      return { error: 'ユーザーの削除に失敗しました: ' + deleteError.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    return { error: 'エラーが発生しました: ' + (error.message || 'Unknown error') };
  }
}

export async function getUserDetails(userId: string) {
  const supabase = getAdminClient();

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, created_at, updated_at, role_id, roles(name)')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { data: null, error: 'ユーザー情報の取得に失敗しました' };
    }

    // 紐付け情報を取得（トレーナーの場合）
    let assignments = null;
    if ((user.roles as any)?.name === 'trainer') {
      const { data: trainerAssignments } = await supabase
        .from('trainer_trainees')
        .select('trainee_id, trainee:users!trainer_trainees_trainee_id_fkey(id, name, email)')
        .eq('trainer_id', userId);
      assignments = trainerAssignments;
    } else if ((user.roles as any)?.name === 'trainee') {
      const { data: traineeAssignment } = await supabase
        .from('trainer_trainees')
        .select('trainer_id, trainer:users!trainer_trainees_trainer_id_fkey(id, name, email)')
        .eq('trainee_id', userId)
        .single();
      assignments = traineeAssignment;
    }

    return { data: { ...user, assignments }, error: null };
  } catch (error: any) {
    return { data: null, error: 'エラーが発生しました: ' + (error.message || 'Unknown error') };
  }
}

export async function assignTraineesToTrainer(trainerId: string, traineeIds: string[]) {
  const supabase = getAdminClient();

  try {
    // 既存の紐付けを削除
    const { error: deleteError } = await supabase
      .from('trainer_trainees')
      .delete()
      .eq('trainer_id', trainerId);

    if (deleteError) {
      return { error: '既存の紐付け削除に失敗しました: ' + deleteError.message };
    }

    // 新しい紐付けを作成
    if (traineeIds.length > 0) {
      const assignments = traineeIds.map(traineeId => ({
        trainer_id: trainerId,
        trainee_id: traineeId,
      }));

      const { error: insertError } = await supabase
        .from('trainer_trainees')
        .insert(assignments);

      if (insertError) {
        return { error: '紐付けの作成に失敗しました: ' + insertError.message };
      }
    }

    revalidatePath('/admin/trainers');
    revalidatePath(`/admin/trainers/${trainerId}`);
    return { success: true };
  } catch (error: any) {
    return { error: 'エラーが発生しました: ' + (error.message || 'Unknown error') };
  }
}

