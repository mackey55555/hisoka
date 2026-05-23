'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  resolveTeamFromSlug,
  setLastTeamSlug,
  type TeamRole,
} from '@/lib/context/current-team';
import { sendInvitationEmail, formatDate } from '@/lib/mail';

const ROLE_LABELS = {
  admin: '管理者',
  trainer: 'トレーナー',
  trainee: 'トレーニー',
} as const;

const inviteSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  role: z.enum(['trainer', 'trainee']),
  trainerId: z.string().uuid().optional().nullable(),
});

interface InviteResult {
  success?: true;
  invitationId?: string;
  invitationUrl?: string;
  emailSent?: boolean;
  warning?: string;
  error?: string;
}

/**
 * チーム admin が trainer / trainee を同チームに招待する。
 * - 設計書 D-5: admin 追加招待は SuperAdmin のみのため、role='admin' は弾く
 * - 既存ユーザーが招待先 email に紐づいていても新しい auth ユーザーは作らず
 *   /invitations/<token> 経由で team_members を1行追加するだけ
 */
export async function inviteTeamMember(
  teamSlug: string,
  rawInput: { email: string; role: string; trainerId?: string | null }
): Promise<InviteResult> {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { error: 'チーム admin 権限が必要です' };
  }

  const parsed = inviteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  const { email, role, trainerId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const admin = getAdminClient();

  // max_members 上限チェック
  const { data: teamRow } = await admin
    .from('teams' as any)
    .select('max_members')
    .eq('id', team.teamId)
    .single();
  const maxMembers = (teamRow as any)?.max_members ?? 5;
  const { count: activeCount } = await admin
    .from('team_members' as any)
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.teamId)
    .eq('status', 'active');
  if ((activeCount ?? 0) >= maxMembers) {
    return { error: `チームの上限 ${maxMembers} 人に達しています` };
  }

  // 同チームに既に active メンバーが email で存在しないか確認
  const { data: existingMembers } = await admin
    .from('team_members' as any)
    .select('user_id, users:user_id ( email )')
    .eq('team_id', team.teamId)
    .eq('status', 'active');
  const alreadyMember = (existingMembers as any[] | null)?.some(
    (m) => (m.users?.email ?? '').toLowerCase() === normalizedEmail
  );
  if (alreadyMember) {
    return { error: '指定のメールアドレスは既にこのチームのメンバーです' };
  }

  // 同 (team_id, email) の未accepted 招待があれば再送扱いで DELETE → 新規発行
  await admin
    .from('team_invitations' as any)
    .delete()
    .eq('team_id', team.teamId)
    .eq('email', normalizedEmail);

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: { user: caller } } = await (await createClient()).auth.getUser();

  const { data: invitation, error: invErr } = await (admin
    .from('team_invitations' as any) as any)
    .insert({
      team_id: team.teamId,
      email: normalizedEmail,
      role,
      invited_by: caller?.id ?? null,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (invErr || !invitation) {
    return { error: '招待の作成に失敗しました: ' + (invErr?.message ?? 'unknown') };
  }

  // trainee で trainerId が指定されていれば trainer_trainees にも先にレコードを作る
  // ただし trainee_id がまだ存在しない（ユーザー受諾前）ので、acceptInvitation 側で処理する。
  // trainer 紐付け情報は team_invitations メタデータに乗せたいが、現状スキーマにないのでスキップ。
  // → MVP では「招待後に admin から手動で trainer-trainee アサインし直す」運用で良しとする
  if (role === 'trainee' && trainerId) {
    // 設計上の注意点としてサーバーログに記録
    console.warn(
      `[invitations] trainee invite with trainerId=${trainerId} — assignment must be done after accept`
    );
  }

  // メール送信
  const siteUrl = resolveSiteUrl();
  const acceptUrl = `${siteUrl}/invitations/${token}`;

  const { exists: userExists } = await isExistingAuthUser(normalizedEmail);

  let emailSent = false;
  let warning: string | undefined;

  if (!userExists) {
    // 未登録ユーザー: Supabase の標準招待メール（auth.users 作成 + magic link 送信）
    const { data: teamInfoNew } = await admin
      .from('teams' as any)
      .select('name')
      .eq('id', team.teamId)
      .single();
    const teamNameNew =
      ((teamInfoNew as any)?.name as string | undefined) ?? 'チーム';
    const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          team_name: teamNameNew,
          role,
          role_label: ROLE_LABELS[role],
          invitation_token: token,
          expires_at: formatDate(expiresAt),
        },
        redirectTo: `${siteUrl}/auth/callback?next=/invitations/${token}`,
      }
    );
    if (emailErr) {
      warning = '招待メール送信に失敗しました（招待URLを直接共有してください）: ' + emailErr.message;
    } else {
      emailSent = true;
    }
  } else {
    // 既存ユーザー: Resend 経由でカスタム招待メールを送信
    // (BUG-001 / BUG-003 対応: docs/team-plan-bugs.md / docs/mail-setup.md)
    const { data: teamInfo } = await admin
      .from('teams' as any)
      .select('name')
      .eq('id', team.teamId)
      .single();
    const teamName = ((teamInfo as any)?.name as string | undefined) ?? 'チーム';

    let inviterName: string | undefined;
    if (caller?.id) {
      const { data: callerRow } = await admin
        .from('users')
        .select('name')
        .eq('id', caller.id)
        .maybeSingle();
      inviterName = ((callerRow as any)?.name as string | undefined) ?? undefined;
    }

    const mailResult = await sendInvitationEmail({
      to: normalizedEmail,
      teamName,
      acceptUrl,
      expiresAt,
      role,
      inviterName,
    });

    if (!mailResult.sent) {
      emailSent = false;
      warning =
        '招待メール送信に失敗しました（招待URLを直接共有してください）: ' +
        (mailResult.error ?? 'unknown');
    } else {
      emailSent = true;
      if (mailResult.redirectedTo) {
        warning = `[DEV] 開発環境のため、メールは ${mailResult.redirectedTo} にリダイレクト送信されました`;
      }
    }
  }

  revalidatePath(`/t/${team.slug}/admin/users`);

  return {
    success: true,
    invitationId: (invitation as any).id,
    invitationUrl: acceptUrl,
    emailSent,
    warning,
  };
}

/**
 * 招待 token を検証して受諾する。
 * SuperAdmin 発行の admin 招待 / admin 発行の trainer/trainee 招待 共通。
 */
export async function acceptInvitation(token: string): Promise<{
  success?: true;
  teamSlug?: string;
  error?: string;
  needsLogin?: boolean;
  needsPasswordSetup?: boolean;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ログインが必要です', needsLogin: true };
  }

  const admin = getAdminClient();
  const { data: invRow, error: invErr } = await admin
    .from('team_invitations' as any)
    .select('id, team_id, email, role, expires_at, accepted_at, teams:team_id ( id, slug, name )')
    .eq('token', token)
    .maybeSingle();

  if (invErr || !invRow) {
    return { error: '招待が見つかりません' };
  }
  const inv = invRow as any;
  if (inv.accepted_at) return { error: 'この招待は既に受諾済みです' };
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return { error: '招待の有効期限が切れています' };
  }

  const userEmail = (user.email ?? '').trim().toLowerCase();
  const inviteEmail = (inv.email ?? '').trim().toLowerCase();
  if (userEmail !== inviteEmail) {
    return {
      error: `この招待は ${inv.email} 宛です。別のアカウントでログインしてください`,
    };
  }

  // 同チームに既に active で所属していないか
  const { data: existing } = await admin
    .from('team_members' as any)
    .select('id, status')
    .eq('team_id', inv.team_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if ((existing as any)?.status === 'active') {
    return { error: 'このチームには既に所属しています' };
  }

  // public.users に upsert
  const { error: upsertErr } = await admin.from('users').upsert(
    {
      id: user.id,
      email: userEmail,
      name: (user.user_metadata?.name as string) ?? userEmail,
    } as any,
    { onConflict: 'id' }
  );
  if (upsertErr) {
    return { error: 'ユーザー情報の登録に失敗しました: ' + upsertErr.message };
  }

  // team_members に INSERT or UPDATE（既に invited 状態なら active に昇格）
  if (existing) {
    const { error: updErr } = await (admin
      .from('team_members' as any) as any)
      .update({ role: inv.role, status: 'active' })
      .eq('id', (existing as any).id);
    if (updErr) {
      return { error: 'メンバー追加に失敗しました: ' + updErr.message };
    }
  } else {
    const { error: insErr } = await (admin
      .from('team_members' as any) as any)
      .insert({
        team_id: inv.team_id,
        user_id: user.id,
        role: inv.role as TeamRole,
        status: 'active',
      });
    if (insErr) {
      return { error: 'メンバー追加に失敗しました: ' + insErr.message };
    }
  }

  // 受諾済みマーク
  await (admin.from('team_invitations' as any) as any)
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id);

  const teamSlug = inv.teams?.slug as string | undefined;
  if (teamSlug) {
    await setLastTeamSlug(teamSlug);
  }

  // パスワード未設定なら set-password を経由させる。
  // 判定方針: この受諾が「初めてのチーム所属」なら、招待メール経由で作られた直後の
  // 未設定状態と見なし、パスワード設定画面に誘導する。
  // 既に他チームに所属しているユーザーは、パスワード設定済みの既存ユーザーなのでスキップ。
  const { count: otherMembershipCount } = await admin
    .from('team_members' as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active');
  const needsPasswordSetup = (otherMembershipCount ?? 0) <= 1;
  // ↑ 1 は「今 INSERT した自分のレコード」のみ = 他に所属がない = 初めての所属

  return { success: true, teamSlug, needsPasswordSetup };
}

/**
 * チームの未受諾 (pending) 招待一覧を返す（チーム admin / SuperAdmin 専用）。
 *
 * 既存 auth.users のメールアドレスについては `isExistingAuthUser=true` を返す。
 * チーム管理者は、これを見て「メール未送信の可能性が高い既存ユーザー」を識別し、
 * `acceptUrl` を手動で共有できる。
 * （BUG-001 / BUG-003 の暫定対応: docs/team-plan-bugs.md 参照）
 */
export interface PendingInvitation {
  id: string;
  email: string;
  role: TeamRole;
  invitedAt: string;
  expiresAt: string;
  acceptUrl: string;
  isExistingAuthUser: boolean;
}

export async function listTeamInvitations(teamSlug: string): Promise<{
  data: PendingInvitation[];
  error?: string;
}> {
  const team = await resolveTeamFromSlug(teamSlug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    return { data: [], error: 'チーム admin 権限が必要です' };
  }

  const admin = getAdminClient();
  const { data: invs, error } = await admin
    .from('team_invitations' as any)
    .select('id, email, role, expires_at, created_at, token')
    .eq('team_id', team.teamId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error || !invs) {
    return { data: [], error: error?.message ?? 'unknown' };
  }

  // 既存 auth.users との一致を1回の listUsers で判定
  const { data: usersList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingEmails = new Set(
    (usersList?.users ?? []).map((u) => (u.email ?? '').toLowerCase())
  );

  const siteUrl = resolveSiteUrl();

  const data: PendingInvitation[] = (invs as any[]).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as TeamRole,
    invitedAt: inv.created_at,
    expiresAt: inv.expires_at,
    acceptUrl: `${siteUrl}/invitations/${inv.token}`,
    isExistingAuthUser: existingEmails.has((inv.email ?? '').toLowerCase()),
  }));

  return { data };
}

/**
 * 招待を取り消す（チーム admin or SuperAdmin）。
 */
export async function revokeInvitation(invitationId: string): Promise<{
  success?: true;
  error?: string;
}> {
  const admin = getAdminClient();
  const { data: inv } = await admin
    .from('team_invitations' as any)
    .select('team_id, email, accepted_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (!inv) return { error: '招待が見つかりません' };
  if ((inv as any).accepted_at) {
    return { error: '既に受諾された招待は取り消せません' };
  }
  const invEmail = ((inv as any).email as string).toLowerCase();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です' };

  // SuperAdmin or 該当チームの admin
  const { data: me } = await supabase
    .from('users')
    .select('is_super_admin' as any)
    .eq('id', user.id)
    .maybeSingle();
  const isSuper = Boolean((me as any)?.is_super_admin);
  if (!isSuper) {
    const { data: m } = await supabase
      .from('team_members' as any)
      .select('role, status')
      .eq('team_id', (inv as any).team_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if ((m as any)?.role !== 'admin' || (m as any)?.status !== 'active') {
      return { error: '権限がありません' };
    }
  }

  const { error: delErr } = await admin
    .from('team_invitations' as any)
    .delete()
    .eq('id', invitationId);
  if (delErr) return { error: '取消に失敗しました: ' + delErr.message };

  // 招待で作られた auth.users が「未受諾・他テナント未所属・未確認」のままなら片付ける。
  // これをやらないと同じメアドへの再招待時に inviteUserByEmail が
  // "User already registered" で失敗する。
  await cleanupOrphanInvitedAuthUser(invEmail);

  return { success: true };
}

/**
 * email に対する auth.users が「招待時に作られたまま放置されている」状態であれば削除する。
 * 安全条件:
 *  - email_confirmed_at IS NULL（パスワード設定 / メール確認をしていない）
 *  - public.users の team_members にも team_invitations(accepted_at != NULL) にも存在しない
 *  - users.is_super_admin = false（SuperAdmin は絶対に消さない）
 */
async function cleanupOrphanInvitedAuthUser(email: string): Promise<void> {
  const admin = getAdminClient();

  // listUsers から email 一致を探す（MVP 範囲）
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = list?.users.find((u) => (u.email ?? '').toLowerCase() === email);
  if (!target) return;

  // 確認済み（パスワード設定済み or メール確認済み）なら触らない
  if ((target as any).email_confirmed_at) return;

  // SuperAdmin は触らない
  const { data: meRow } = await admin
    .from('users')
    .select('is_super_admin' as any)
    .eq('id', target.id)
    .maybeSingle();
  if ((meRow as any)?.is_super_admin) return;

  // 既に何らかのチームに active で所属していれば触らない
  const { count: memberCount } = await admin
    .from('team_members' as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', target.id)
    .eq('status', 'active');
  if ((memberCount ?? 0) > 0) return;

  // 過去に accept された招待がある email なら触らない
  const { count: acceptedCount } = await admin
    .from('team_invitations' as any)
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .not('accepted_at', 'is', null);
  if ((acceptedCount ?? 0) > 0) return;

  // 残っている未accept招待があるなら触らない（別チームから招待中の可能性）
  const { count: pendingCount } = await admin
    .from('team_invitations' as any)
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .is('accepted_at', null);
  if ((pendingCount ?? 0) > 0) return;

  // public.users 行も削除（auth.users の CASCADE で消えるが明示）→ auth ユーザー削除
  await admin.from('users').delete().eq('id', target.id);
  await admin.auth.admin.deleteUser(target.id);
}

async function isExistingAuthUser(email: string): Promise<{ exists: boolean }> {
  const admin = getAdminClient();
  // ページング: MVP では最初の100件で十分という前提。本番運用で増えるなら実装見直し。
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data) return { exists: false };
  return { exists: data.users.some((u) => (u.email ?? '').toLowerCase() === email) };
}

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000';
  return raw.startsWith('http') ? raw : `https://${raw}`;
}
