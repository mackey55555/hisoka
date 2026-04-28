'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolveTeamFromSlug, type TeamRole } from '@/lib/context/current-team';

/**
 * 旧 admin.ts の API（roles/role_id ベース）を team_members ベースに書き換えたもの。
 * すべての関数で第1引数に teamSlug を取る。
 */

interface ListedUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: TeamRole;
}

/**
 * チーム内の全メンバーを取得（admin 用ユーザー一覧）。
 */
export async function listTeamUsers(teamSlug: string): Promise<{
  data: ListedUser[];
  error?: string;
}> {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { data: [], error: 'チーム admin 権限が必要です' };
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('team_members' as any)
    .select('role, joined_at, users:user_id ( id, name, email, created_at )')
    .eq('team_id', team.teamId)
    .eq('status', 'active');

  if (error || !data) return { data: [], error: error?.message ?? 'unknown' };

  const list: ListedUser[] = (data as any[])
    .filter((row) => row.users)
    .map((row) => ({
      id: row.users.id,
      name: row.users.name,
      email: row.users.email,
      created_at: row.users.created_at,
      role: row.role as TeamRole,
    }));
  return { data: list };
}

/**
 * トレーナー一覧（select 用）。
 */
export async function getTrainersForSelect(teamSlug: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('team_members' as any)
    .select('users:user_id ( id, name, email )')
    .eq('team_id', team.teamId)
    .eq('role', 'trainer')
    .eq('status', 'active');

  if (error || !data) return { data: [], error: error?.message ?? null };
  const list = (data as any[])
    .map((row) => row.users)
    .filter((u): u is { id: string; name: string; email: string } => Boolean(u?.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { data: list, error: null };
}

const updateUserSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  role: z.enum(['trainer', 'trainee']),
});

/**
 * チーム内ユーザーの更新（名前/メール/役割/任意でパスワード）。
 * 役割変更は admin 以外への変更のみ受ける（admin の追加は SuperAdmin のみ）。
 */
export async function updateUser(
  teamSlug: string,
  userId: string,
  formData: FormData
) {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { error: 'チーム admin 権限が必要です' };
  }

  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    role: formData.get('role') as string,
    password: formData.get('password') as string | null,
  };
  const validated = updateUserSchema.safeParse(rawData);
  if (!validated.success) return { error: validated.error.errors[0].message };

  const admin = getAdminClient();

  const { error: userError } = await (admin as any)
    .from('users')
    .update({
      name: validated.data.name,
      email: validated.data.email.trim().toLowerCase(),
    })
    .eq('id', userId);
  if (userError) return { error: 'ユーザー情報の更新に失敗しました: ' + userError.message };

  const { error: tmError } = await (admin
    .from('team_members' as any) as any)
    .update({ role: validated.data.role })
    .eq('team_id', team.teamId)
    .eq('user_id', userId);
  if (tmError) return { error: 'ロール更新に失敗しました: ' + tmError.message };

  const updateData: any = {
    email: validated.data.email.trim().toLowerCase(),
    user_metadata: { name: validated.data.name },
  };
  if (rawData.password && rawData.password.trim().length >= 8) {
    updateData.password = rawData.password;
  }
  const { error: authError } = await admin.auth.admin.updateUserById(
    userId,
    updateData
  );
  if (authError && rawData.password) {
    return { error: 'パスワード更新に失敗しました: ' + authError.message };
  }

  revalidatePath(`/t/${team.slug}/admin/users`);
  return { success: true };
}

/**
 * チームからユーザーを除外する（auth.users は残す）。
 * SaaS 化以降「ユーザーの削除」=「特定チームから外す」の意味に変わったため改称。
 */
export async function removeUserFromTeam(teamSlug: string, userId: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { error: 'チーム admin 権限が必要です' };
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from('team_members' as any)
    .delete()
    .eq('team_id', team.teamId)
    .eq('user_id', userId);
  if (error) return { error: '除外に失敗しました: ' + error.message };

  revalidatePath(`/t/${team.slug}/admin/users`);
  return { success: true };
}

/**
 * ユーザー詳細（チームスコープ）。
 */
export async function getUserDetails(teamSlug: string, userId: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const admin = getAdminClient();

  const { data: userRow, error } = await admin
    .from('users')
    .select('id, name, email, created_at, updated_at')
    .eq('id', userId)
    .single();
  if (error || !userRow) return { data: null, error: 'ユーザーが見つかりません' };
  const user = userRow as {
    id: string;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  };

  const { data: memberRow } = await admin
    .from('team_members' as any)
    .select('role')
    .eq('team_id', team.teamId)
    .eq('user_id', userId)
    .maybeSingle();
  const role = (memberRow as any)?.role as TeamRole | undefined;

  let assignments: any = null;
  if (role === 'trainer') {
    const { data } = await admin
      .from('trainer_trainees')
      .select(
        'trainee_id, trainee:users!trainer_trainees_trainee_id_fkey(id, name, email)'
      )
      .eq('trainer_id', userId)
      .eq('team_id', team.teamId);
    assignments = data;
  } else if (role === 'trainee') {
    const { data } = await admin
      .from('trainer_trainees')
      .select(
        'trainer_id, trainer:users!trainer_trainees_trainer_id_fkey(id, name, email)'
      )
      .eq('trainee_id', userId)
      .eq('team_id', team.teamId)
      .maybeSingle();
    assignments = data;
  }

  return { data: { ...user, role, assignments }, error: null };
}

/**
 * チーム内のトレーニーアサインメントマップ（trainee_id → trainer_id）。
 */
export async function getTraineeAssignments(teamSlug: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('trainer_trainees')
    .select('trainee_id, trainer_id')
    .eq('team_id', team.teamId);
  if (error) return { data: null, error: '紐付け情報の取得に失敗しました' };

  const map = new Map<string, string>();
  (data as any[] | null)?.forEach((a) => {
    map.set(a.trainee_id, a.trainer_id);
  });
  return { data: map, error: null };
}

/**
 * チーム内の既存 trainer-trainee アサイン一覧。
 */
export async function listTeamAssignments(teamSlug: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('trainer_trainees')
    .select(
      'id, created_at, trainer:users!trainer_trainees_trainer_id_fkey(id, name, email), trainee:users!trainer_trainees_trainee_id_fkey(id, name, email)'
    )
    .eq('team_id', team.teamId)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

/**
 * 単一の trainer-trainee アサインメント作成。
 */
export async function createAssignment(
  teamSlug: string,
  trainerId: string,
  traineeId: string
) {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { error: 'チーム admin 権限が必要です' };
  }
  const admin = getAdminClient();
  const { error } = await (admin
    .from('trainer_trainees') as any)
    .insert({ trainer_id: trainerId, trainee_id: traineeId, team_id: team.teamId });
  if (error) return { error: '紐付け作成に失敗しました: ' + error.message };

  revalidatePath(`/t/${team.slug}/admin/assignments`);
  return { success: true };
}

/**
 * アサインメント削除。
 */
export async function removeAssignment(teamSlug: string, assignmentId: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { error: 'チーム admin 権限が必要です' };
  }
  const admin = getAdminClient();
  const { error } = await admin
    .from('trainer_trainees')
    .delete()
    .eq('id', assignmentId)
    .eq('team_id', team.teamId);
  if (error) return { error: '削除に失敗しました: ' + error.message };

  revalidatePath(`/t/${team.slug}/admin/assignments`);
  return { success: true };
}

/**
 * 既存トレーナーに対し、担当トレーニーを再アサインする。
 */
export async function assignTraineesToTrainer(
  teamSlug: string,
  trainerId: string,
  traineeIds: string[]
) {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { error: 'チーム admin 権限が必要です' };
  }

  const admin = getAdminClient();
  const { error: deleteError } = await admin
    .from('trainer_trainees')
    .delete()
    .eq('team_id', team.teamId)
    .eq('trainer_id', trainerId);
  if (deleteError) return { error: '既存の紐付け削除に失敗しました: ' + deleteError.message };

  if (traineeIds.length > 0) {
    const rows = traineeIds.map((tid) => ({
      trainer_id: trainerId,
      trainee_id: tid,
      team_id: team.teamId,
    }));
    const { error: insertError } = await (admin
      .from('trainer_trainees') as any)
      .insert(rows);
    if (insertError) return { error: '紐付けの作成に失敗しました: ' + insertError.message };
  }

  revalidatePath(`/t/${team.slug}/admin/trainers`);
  revalidatePath(`/t/${team.slug}/admin/trainers/${trainerId}`);
  return { success: true };
}
