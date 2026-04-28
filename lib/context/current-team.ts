import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type TeamRole = 'admin' | 'trainer' | 'trainee';

export interface ResolvedTeam {
  teamId: string;
  slug: string;
  name: string;
  role: TeamRole;
  status: string;
  isSuperAdmin: boolean;
}

const COOKIE_NAME = 'hisoka_last_team';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * URL slug からチームを解決し、現在ログイン中ユーザーのメンバーシップを検証する。
 * SuperAdmin は所属していなくても 'admin' ロール扱いで通す。
 * NG なら notFound() を throw（next/navigation）。
 */
export async function resolveTeamFromSlug(slug: string): Promise<ResolvedTeam> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: team, error: teamErr } = await supabase
    .from('teams' as any)
    .select('id, slug, name')
    .eq('slug', slug)
    .single();

  if (teamErr || !team) notFound();
  const t = team as { id: string; slug: string; name: string };

  const isSuperAdmin = await checkIsSuperAdmin(user.id);

  const { data: membership } = await supabase
    .from('team_members' as any)
    .select('role, status')
    .eq('team_id', t.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const m = membership as { role: TeamRole; status: string } | null;

  if (!m || m.status !== 'active') {
    if (!isSuperAdmin) notFound();
    return {
      teamId: t.id,
      slug: t.slug,
      name: t.name,
      role: 'admin',
      status: 'active',
      isSuperAdmin: true,
    };
  }

  return {
    teamId: t.id,
    slug: t.slug,
    name: t.name,
    role: m.role,
    status: m.status,
    isSuperAdmin,
  };
}

/**
 * cookie に保存された「直近開いていたチーム」slug を返す。
 */
export async function getLastTeamSlug(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/**
 * cookie に直近チーム slug を保存（次回ログイン時の自動遷移用）。
 */
export async function setLastTeamSlug(slug: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, slug, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  });
}

export async function clearLastTeamSlug(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export interface MyTeamSummary {
  id: string;
  slug: string;
  name: string;
  role: TeamRole;
}

/**
 * 現在ログイン中ユーザーが所属するチーム一覧（active のみ）。
 */
export async function listMyTeams(): Promise<MyTeamSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('team_members' as any)
    .select('role, teams:team_id ( id, slug, name )')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error || !data) return [];

  return (data as any[])
    .filter((row) => row.teams)
    .map((row) => ({
      id: row.teams.id,
      slug: row.teams.slug,
      name: row.teams.name,
      role: row.role as TeamRole,
    }));
}

async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('is_super_admin' as any)
    .eq('id', userId)
    .maybeSingle();
  return Boolean((data as any)?.is_super_admin);
}

export async function getIsSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return checkIsSuperAdmin(user.id);
}
