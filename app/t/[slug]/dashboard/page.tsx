import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getGoals } from '@/lib/actions/goals';
import { getMyDiagnosis } from '@/lib/actions/ai';
import { createClient } from '@/lib/supabase/server';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { formatYmd } from '@/lib/utils/helpers';
import { ProgressCharts } from '@/components/features/dashboard/progress-charts';
import { GoalsListSection } from '@/components/features/dashboard/goals-list-section';
import { StreakCard } from '@/components/features/dashboard/streak-card';
import { MorningCard } from '@/components/features/dashboard/morning-card';
import { QuickActivityEntry } from '@/components/features/dashboard/quick-activity-entry';
import { TutorialBanner } from '@/components/features/tutorial/tutorial-banner';
import type { Reflection } from '@/types';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const team = await resolveTeamFromSlug(slug);
  if (team.role === 'admin') {
    redirect(`/t/${slug}/admin`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single();

  const userDataTyped = userData as { name: string } | null;

  const { data: goals } = await getGoals(slug);
  const goalsArray =
    (goals as Array<{
      id: string;
      content: string;
      deadline: string;
      status: string;
      created_at: string;
    }> | null) || [];
  const goalIds = goalsArray.map((g) => g.id);

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  const [
    { data: allActivities },
    { data: pastReflections },
    diagnosisResult,
  ] = await Promise.all([
    goalIds.length > 0
      ? supabase
          .from('activities')
          .select('id, goal_id, created_at')
          .in('goal_id', goalIds)
          .gte('created_at', oneYearAgo.toISOString())
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: string; goal_id: string; created_at: string }> }),
    supabase
      .from('reflections')
      .select('*, activities!inner(goal_id, goals!inner(user_id))')
      .eq('activities.goals.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    getMyDiagnosis(slug, thisYear, thisMonth + 1),
  ]);

  const activities =
    (allActivities as Array<{
      id: string;
      goal_id: string;
      created_at: string;
    }> | null) || [];

  const activityCountThisMonth = activities.filter((a) => {
    const d = new Date(a.created_at);
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
  }).length;

  const activitiesForCharts = activities.filter((a) => {
    return new Date(a.created_at) >= sixMonthsAgo;
  });

  const activityDates = activities.map((a) => formatYmd(a.created_at));

  const reflections = (pastReflections as Reflection[] | null) || [];
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const eligiblePast = reflections.filter(
    (r) => new Date(r.created_at) < oneWeekAgo
  );
  const pastReflection = eligiblePast.length > 0
    ? eligiblePast[Math.floor(Math.random() * eligiblePast.length)]
    : null;

  const statsByGoalId: Record<
    string,
    { activityCount: number; reflectionCount: number; lastActivityAt: string | null }
  > = {};
  for (const goal of goalsArray) {
    statsByGoalId[goal.id] = {
      activityCount: 0,
      reflectionCount: 0,
      lastActivityAt: null,
    };
  }
  for (const a of activities) {
    const s = statsByGoalId[a.goal_id];
    if (!s) continue;
    s.activityCount++;
    if (!s.lastActivityAt || a.created_at > s.lastActivityAt) {
      s.lastActivityAt = a.created_at;
    }
  }
  for (const r of reflections) {
    const goalId = (r as unknown as { activities?: { goal_id: string } }).activities?.goal_id;
    if (!goalId) continue;
    const s = statsByGoalId[goalId];
    if (!s) continue;
    s.reflectionCount++;
  }

  const inProgressCount = goalsArray.filter((g) => g.status === 'in_progress').length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          こんにちは、{userDataTyped?.name || 'ユーザー'}さん
        </h1>
        <p className="text-text-secondary">今日も少しずつ、書き残していきましょう</p>
      </div>

      <TutorialBanner teamSlug={slug} />

      <QuickActivityEntry teamSlug={slug} goals={goalsArray} />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <p className="text-sm text-text-secondary mb-1">進行中の目標</p>
          <p className="text-3xl font-bold text-primary tabular-nums leading-none">
            {inProgressCount}
            <span className="text-base text-text-secondary font-normal ml-1">件</span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary mb-1">今月の活動</p>
          <p className="text-3xl font-bold text-primary tabular-nums leading-none">
            {activityCountThisMonth}
            <span className="text-base text-text-secondary font-normal ml-1">件</span>
          </p>
        </Card>
      </div>

      <StreakCard activityDates={activityDates} />

      <MorningCard diagnosis={diagnosisResult.data ?? null} pastReflection={pastReflection} />

      <GoalsListSection goals={goalsArray} statsByGoalId={statsByGoalId} />

      {activitiesForCharts.length > 0 && (
        <ProgressCharts
          activities={activitiesForCharts.map((a) => ({ created_at: a.created_at }))}
        />
      )}

      <div className="text-center">
        <Link href={`/t/${slug}/goals/new`}>
          <Button variant="primary" className="px-8">
            + 新規目標
          </Button>
        </Link>
      </div>
    </div>
  );
}
