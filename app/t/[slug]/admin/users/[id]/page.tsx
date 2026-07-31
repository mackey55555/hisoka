import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { getAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils/helpers';
import { TraineeProgressList } from '@/components/features/trainer/trainee-progress-list';
import type { Activity, Goal, Reflection, Role } from '@/types';

const ROLE_LABELS: Record<Role, string> = {
  admin: '管理者',
  trainer: 'トレーナー',
  trainee: 'トレーニー',
};

/**
 * admin 用メンバー詳細。任意のメンバー(trainee/trainer 問わず)の目標・活動・振り返りを確認する。
 * admin / SuperAdmin のみ。データ取得は service key(admin)で行う。
 */
export default async function AdminMemberDetailPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const team = await resolveTeamFromSlug(params.slug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    notFound();
  }

  const admin = getAdminClient();

  // 対象がこのチームのメンバーか確認
  const [{ data: memberRow }, { data: userRow }] = await Promise.all([
    (admin.from('team_members' as any) as any)
      .select('role, status')
      .eq('team_id', team.teamId)
      .eq('user_id', params.id)
      .maybeSingle(),
    (admin.from('users' as any) as any)
      .select('id, name, email')
      .eq('id', params.id)
      .maybeSingle(),
  ]);

  if (!memberRow || !userRow) notFound();

  const member = memberRow as { role: Role; status: string };
  const u = userRow as { id: string; name: string; email: string };

  // 目標→活動→振り返り（admin なので全期間・オーバーサイト）
  const { data: goalsData } = await (admin.from('goals' as any) as any)
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false });

  const goals: Goal[] = (goalsData as Goal[] | null) || [];
  const goalIds = goals.map((g) => g.id);

  const [activitiesResult, reflectionsResult] =
    goalIds.length > 0
      ? await Promise.all([
          (admin.from('activities' as any) as any)
            .select('*')
            .in('goal_id', goalIds)
            .order('created_at', { ascending: false }),
          (admin.from('reflections' as any) as any)
            .select('id, activity_id, content, created_at, updated_at, activities!inner(goal_id)')
            .in('activities.goal_id', goalIds)
            .order('created_at', { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

  const activities: Activity[] = (activitiesResult.data as Activity[] | null) || [];
  const reflections: Reflection[] = (reflectionsResult.data as Reflection[] | null) || [];

  const activitiesByGoalId: Record<string, Activity[]> = {};
  for (const a of activities) {
    (activitiesByGoalId[a.goal_id] ||= []).push(a);
  }
  const reflectionsByActivityId: Record<string, Reflection[]> = {};
  for (const r of reflections) {
    (reflectionsByActivityId[r.activity_id] ||= []).push(r);
  }

  const lastActivity = activities[0];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={`/t/${params.slug}/admin/users`} className="text-sm text-primary hover:underline">
        ← ユーザー管理
      </Link>

      <div className="mt-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-text-primary">{u.name || u.email}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
          {member.status !== 'active' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">
              {member.status}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {u.email}
          <span className="mx-2">/</span>
          目標 {goals.length}件
          {lastActivity && <span className="ml-2">最終活動 {formatDate(lastActivity.created_at)}</span>}
        </p>
      </div>

      <TraineeProgressList
        goals={goals}
        activitiesByGoalId={activitiesByGoalId}
        reflectionsByActivityId={reflectionsByActivityId}
      />
    </div>
  );
}
