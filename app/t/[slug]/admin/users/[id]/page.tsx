import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { getAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils/helpers';
import { TraineeProgressList } from '@/components/features/trainer/trainee-progress-list';
import { MonthNavigator } from '@/components/features/ai/month-navigator';
import { SummaryCard } from '@/components/features/ai/summary-card';
import { SentimentSection } from '@/components/features/ai/sentiment-section-lazy';
import { SkillEvidenceSection } from '@/components/features/ai/skill-evidence-section';
import { SkillTrendSection } from '@/components/features/ai/skill-trend-section';
import { Card } from '@/components/ui/card';
import type { Activity, Goal, Reflection, Role, AiDiagnosis, UserSkillProfile } from '@/types';

const ROLE_LABELS: Record<Role, string> = {
  admin: '管理者',
  trainer: 'トレーナー',
  trainee: 'トレーニー',
};

/**
 * admin 用メンバー詳細。任意のメンバー(trainee/trainer 問わず)の
 * 目標・活動・AI月次診断・密かなスキルを一画面で確認する。
 * admin / SuperAdmin のみ。取得は service key(admin)で行い、閲覧期間の制限は掛けない(オーバーサイト)。
 */
export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string; id: string };
  searchParams: { year?: string; month?: string };
}) {
  const team = await resolveTeamFromSlug(params.slug);
  if (team.role !== 'admin' && !team.isSuperAdmin) {
    notFound();
  }

  const admin = getAdminClient();
  const uid = params.id;

  const [{ data: memberRow }, { data: userRow }] = await Promise.all([
    (admin.from('team_members' as any) as any)
      .select('role, status').eq('team_id', team.teamId).eq('user_id', uid).maybeSingle(),
    (admin.from('users' as any) as any)
      .select('id, name, email').eq('id', uid).maybeSingle(),
  ]);
  if (!memberRow || !userRow) notFound();
  const member = memberRow as { role: Role; status: string };
  const u = userRow as { id: string; name: string; email: string };

  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;

  // 目標 / AI診断(当月) / 履歴 / 密かなスキル を並列取得
  const [
    { data: goalsData },
    { data: diagRow },
    { data: histRows },
    { data: profileRow },
  ] = await Promise.all([
    (admin.from('goals' as any) as any)
      .select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    (admin.from('ai_diagnoses' as any) as any)
      .select('*').eq('user_id', uid).eq('team_id', team.teamId).eq('year', year).eq('month', month).maybeSingle(),
    (admin.from('ai_diagnoses' as any) as any)
      .select('*').eq('user_id', uid).eq('team_id', team.teamId)
      .order('year', { ascending: true }).order('month', { ascending: true }),
    (admin.from('user_skill_profiles' as any) as any)
      .select('*').eq('user_id', uid).eq('team_id', team.teamId).maybeSingle(),
  ]);

  const goals: Goal[] = (goalsData as Goal[] | null) || [];
  const goalIds = goals.map((g) => g.id);
  const diagnosis = (diagRow as AiDiagnosis | null) ?? null;
  const history = (histRows as AiDiagnosis[] | null) || [];
  const profile = (profileRow as UserSkillProfile | null) ?? null;

  const [activitiesResult, reflectionsResult] =
    goalIds.length > 0
      ? await Promise.all([
          (admin.from('activities' as any) as any)
            .select('*').in('goal_id', goalIds).order('created_at', { ascending: false }),
          (admin.from('reflections' as any) as any)
            .select('id, activity_id, content, created_at, updated_at, activities!inner(goal_id)')
            .in('activities.goal_id', goalIds).order('created_at', { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

  const activities: Activity[] = (activitiesResult.data as Activity[] | null) || [];
  const reflections: Reflection[] = (reflectionsResult.data as Reflection[] | null) || [];

  const activitiesByGoalId: Record<string, Activity[]> = {};
  for (const a of activities) (activitiesByGoalId[a.goal_id] ||= []).push(a);
  const reflectionsByActivityId: Record<string, Reflection[]> = {};
  for (const r of reflections) (reflectionsByActivityId[r.activity_id] ||= []).push(r);

  const lastActivity = activities[0];
  const basePath = `/t/${params.slug}/admin/users/${uid}`;
  const fakeProfileDiag = profile
    ? ({ skill_evidence: profile.skill_evidence } as unknown as AiDiagnosis)
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={`/t/${params.slug}/admin/users`} className="text-sm text-primary hover:underline">
        ← ユーザー管理
      </Link>

      {/* メンバー基本情報 */}
      <div className="mt-4 mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-text-primary">{u.name || u.email}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
          {member.status !== 'active' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">{member.status}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {u.email}
          <span className="mx-2">/</span>
          目標 {goals.length}件
          {lastActivity && <span className="ml-2">最終活動 {formatDate(lastActivity.created_at)}</span>}
        </p>
      </div>

      {/* AI月次診断 */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-text-primary mb-3 pb-2 border-b border-border">AI月次診断</h2>
        <MonthNavigator year={year} month={month} basePath={basePath} />
        {diagnosis ? (
          <>
            <SummaryCard summary={diagnosis.summary} />
            <SentimentSection diagnosis={diagnosis} history={history} />
            <SkillEvidenceSection diagnosis={diagnosis} />
            <SkillTrendSection history={history} />
          </>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-10">
              {year}年{month}月のAI診断はまだありません
            </p>
          </Card>
        )}
      </section>

      {/* 密かなスキル（全期間） */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-text-primary mb-3 pb-2 border-b border-border">あなたの密かなスキル（全期間）</h2>
        {fakeProfileDiag ? (
          <SkillEvidenceSection
            diagnosis={fakeProfileDiag}
            title="密かなスキル（全期間）"
            intro="これまでの記録全体から見取れた、このメンバーの“密かな”力です。"
          />
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-10">まだ「密かなスキル」は生成されていません。</p>
          </Card>
        )}
      </section>

      {/* 目標・活動・振り返り */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-3 pb-2 border-b border-border">目標・活動・振り返り</h2>
        <TraineeProgressList
          goals={goals}
          activitiesByGoalId={activitiesByGoalId}
          reflectionsByActivityId={reflectionsByActivityId}
        />
      </section>
    </div>
  );
}
