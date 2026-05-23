'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendInvitationEmail, formatDate } from '@/lib/mail';

const ROLE_LABELS = {
  admin: '管理者',
  trainer: 'トレーナー',
  trainee: 'トレーニー',
} as const;

async function requireSuperAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインが必要です');
  const { data: me } = await supabase
    .from('users')
    .select('is_super_admin' as any)
    .eq('id', user.id)
    .maybeSingle();
  if (!(me as any)?.is_super_admin) throw new Error('SuperAdmin 権限が必要です');
  return { userId: user.id };
}

const provisionSchema = z.object({
  name: z.string().min(1, 'チーム名を入力してください').max(100),
  slug: z
    .string()
    .min(2, 'slug は2文字以上で入力してください')
    .max(60)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'slug は a-z, 0-9, ハイフンのみ使用できます'),
  plan: z.enum(['free', 'starter', 'pro']).default('free'),
  adminEmail: z.string().email('有効なメールアドレスを入力してください'),
  adminName: z.string().min(1, '初代adminの氏名を入力してください').max(100),
});

export type ProvisionInput = z.infer<typeof provisionSchema>;

interface ProvisionResult {
  success?: true;
  teamId?: string;
  invitationToken?: string;
  invitationUrl?: string;
  emailSent?: boolean;
  warning?: string;
  error?: string;
}

/**
 * SuperAdmin が新チームを発行し、初代 admin を招待する。
 * 1. provision_team RPC で teams + team_invitations を作成
 * 2. supabase.auth.admin.inviteUserByEmail で招待メール送信
 * 3. 失敗したら team_invitations を削除してロールバック扱い
 */
export async function provisionTeam(input: ProvisionInput): Promise<ProvisionResult> {
  const parsed = provisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  const { name, slug, plan, adminEmail, adminName } = parsed.data;

  let invitedBy: string;
  try {
    invitedBy = (await requireSuperAdmin()).userId;
  } catch (e: any) {
    return { error: e.message ?? 'SuperAdmin 権限が必要です' };
  }

  const admin = getAdminClient();

  // slug 重複チェック（事前にエラー文言を出す。RPC側のUNIQUE制約に頼ってもよいが）
  const { data: existing } = await admin
    .from('teams' as any)
    .select('id')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();
  if (existing) {
    return { error: `slug "${slug}" は既に使われています` };
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: teamId, error: rpcError } = await (admin.rpc as any)('provision_team', {
    p_team_name: name,
    p_team_slug: slug.toLowerCase(),
    p_plan: plan,
    p_admin_email: adminEmail,
    p_admin_name: adminName,
    p_invited_by: invitedBy,
    p_token: token,
    p_expires_at: expiresAt,
  });

  if (rpcError || !teamId) {
    return { error: 'チーム作成に失敗しました: ' + (rpcError?.message ?? 'unknown') };
  }

  // 招待メール送信（既存 auth ユーザーの場合は inviteUserByEmail がエラーになるので
  //  magiclink にフォールバックする）
  const siteUrl = resolveSiteUrl();
  const acceptUrl = `${siteUrl}/invitations/${token}`;
  const redirectTo = `${siteUrl}/auth/callback?next=/invitations/${token}`;
  const normalizedEmail = adminEmail.toLowerCase();

  const userExists = await isExistingAuthUser(normalizedEmail);

  let emailSent = false;
  let warning: string | undefined;

  if (!userExists) {
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          name: adminName,
          team_name: name,
          role: 'admin',
          role_label: ROLE_LABELS.admin,
          invitation_token: token,
          expires_at: formatDate(expiresAt),
        },
        redirectTo,
      }
    );
    if (inviteErr) {
      // 新規招待が失敗 → ロールバック
      await admin.from('team_invitations' as any).delete().eq('token', token);
      await admin.from('teams' as any).delete().eq('id', teamId as string);
      return {
        error:
          '招待メール送信に失敗したためチーム発行を取り消しました: ' + inviteErr.message,
      };
    }
    emailSent = true;
  } else {
    // 既存 auth ユーザー: Resend 経由でカスタム招待メール
    // (BUG-001 / BUG-003 対応: docs/team-plan-bugs.md / docs/mail-setup.md)
    const mailResult = await sendInvitationEmail({
      to: normalizedEmail,
      teamName: name,
      acceptUrl,
      expiresAt,
      role: 'admin',
      inviterName: undefined,
    });
    if (!mailResult.sent) {
      warning =
        '既存ユーザー宛の招待メール送信に失敗しました（招待URLを直接共有してください）: ' +
        (mailResult.error ?? 'unknown');
      emailSent = false;
    } else {
      emailSent = true;
      if (mailResult.redirectedTo) {
        warning = `[DEV] 開発環境のため、メールは ${mailResult.redirectedTo} にリダイレクト送信されました`;
      }
    }
  }

  revalidatePath('/super-admin');
  revalidatePath('/super-admin/teams');

  return {
    success: true,
    teamId: teamId as string,
    invitationToken: token,
    invitationUrl: acceptUrl,
    emailSent,
    warning,
  } as ProvisionResult;
}

async function isExistingAuthUser(email: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data) return false;
  const lower = email.toLowerCase();
  return data.users.some((u) => (u.email ?? '').toLowerCase() === lower);
}

/**
 * テナント一覧（メンバー数つき）。
 */
export async function listTeams() {
  await requireSuperAdmin();
  const admin = getAdminClient();
  const { data: teams, error } = await admin
    .from('teams' as any)
    .select('id, name, slug, plan, status, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const ids = (teams as any[] | null)?.map((t) => t.id) ?? [];
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: members } = await admin
      .from('team_members' as any)
      .select('team_id')
      .in('team_id', ids)
      .eq('status', 'active');
    (members as any[] | null)?.forEach((m) => {
      counts.set(m.team_id, (counts.get(m.team_id) ?? 0) + 1);
    });
  }

  return (teams as any[] | null)?.map((t) => ({
    ...t,
    member_count: counts.get(t.id) ?? 0,
  })) ?? [];
}

/**
 * テナント詳細（メンバー一覧 + pending invitations）。
 */
export async function getTeamDetail(teamId: string) {
  await requireSuperAdmin();
  const admin = getAdminClient();

  const { data: team, error: teamErr } = await admin
    .from('teams' as any)
    .select('*')
    .eq('id', teamId)
    .single();
  if (teamErr || !team) throw new Error('テナントが見つかりません');

  const { data: members } = await admin
    .from('team_members' as any)
    .select('id, role, status, joined_at, users:user_id ( id, name, email, is_super_admin )')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  const { data: invitations } = await admin
    .from('team_invitations' as any)
    .select('id, email, role, expires_at, accepted_at, created_at, token')
    .eq('team_id', teamId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  return { team: team as any, members: (members as any[]) ?? [], invitations: (invitations as any[]) ?? [] };
}

const statusSchema = z.enum(['active', 'suspended', 'cancelled']);

export async function updateTeamStatus(
  teamId: string,
  status: 'active' | 'suspended' | 'cancelled'
) {
  await requireSuperAdmin();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) throw new Error('不正な status です');
  const admin = getAdminClient();
  const { error } = await (admin
    .from('teams' as any) as any)
    .update({ status })
    .eq('id', teamId);
  if (error) throw new Error(error.message);

  revalidatePath('/super-admin');
  revalidatePath(`/super-admin/teams/${teamId}`);
  return { success: true };
}

export async function toggleSuperAdmin(userId: string, value: boolean) {
  await requireSuperAdmin();
  const admin = getAdminClient();
  const { error } = await (admin as any)
    .from('users')
    .update({ is_super_admin: value })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return { success: true };
}

const adminInviteSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string().min(1, '氏名を入力してください').max(100),
});

/**
 * 既存テナントに admin を追加で招待する（admin が辞めた時の救済等）。
 */
export async function inviteAdditionalAdmin(
  teamId: string,
  rawInput: { email: string; name: string }
): Promise<{ success?: true; invitationUrl?: string; error?: string }> {
  let invitedBy: string;
  try {
    invitedBy = (await requireSuperAdmin()).userId;
  } catch (e: any) {
    return { error: e.message ?? 'SuperAdmin 権限が必要です' };
  }

  const parsed = adminInviteSchema.safeParse(rawInput);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { email, name } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const admin = getAdminClient();

  // チーム存在確認
  const { data: teamRow } = await admin
    .from('teams' as any)
    .select('id, slug, name')
    .eq('id', teamId)
    .maybeSingle();
  if (!teamRow) return { error: 'テナントが見つかりません' };

  // 同 email の pending 招待があれば DELETE して再発行
  await admin
    .from('team_invitations' as any)
    .delete()
    .eq('team_id', teamId)
    .eq('email', normalizedEmail);

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insErr } = await (admin
    .from('team_invitations' as any) as any)
    .insert({
      team_id: teamId,
      email: normalizedEmail,
      role: 'admin',
      invited_by: invitedBy,
      token,
      expires_at: expiresAt,
    });
  if (insErr) return { error: '招待の作成に失敗しました: ' + insErr.message };

  const siteUrl = resolveSiteUrl();
  const acceptUrl = `${siteUrl}/invitations/${token}`;
  const redirectTo = `${siteUrl}/auth/callback?next=/invitations/${token}`;

  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: {
        name,
        team_name: (teamRow as any)?.name ?? 'チーム',
        role: 'admin',
        role_label: ROLE_LABELS.admin,
        invitation_token: token,
        expires_at: formatDate(new Date(expiresAt).toISOString()),
      },
      redirectTo,
    }
  );

  // 既存ユーザーで invite が失敗するケースは Resend 経由のカスタム送信にフォールバック
  // (BUG-001 / BUG-003 対応: docs/team-plan-bugs.md)
  if (emailErr) {
    const expiresAtIso = new Date(expiresAt).toISOString();
    await sendInvitationEmail({
      to: normalizedEmail,
      teamName: (teamRow as any)?.name ?? 'チーム',
      acceptUrl,
      expiresAt: expiresAtIso,
      role: 'admin',
      inviterName: undefined,
    });
    // フォールバック送信が失敗しても invitationUrl は返す（手動共有可能）
  }

  revalidatePath(`/super-admin/teams/${teamId}`);
  return { success: true, invitationUrl: acceptUrl };
}

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000';
  return raw.startsWith('http') ? raw : `https://${raw}`;
}
