import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/helpers';
import { TraineeProgressList } from '@/components/features/trainer/trainee-progress-list';
import type { Activity, Goal, Reflection } from '@/types';

export default async function TraineeDetailPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // assignment / trainee / goals は独立しているので並列で取る
  const [
    { data: assignment },
    { data: trainee },
    { data: goalsData },
  ] = await Promise.all([
    supabase
      .from('trainer_trainees')
      .select('trainee_id')
      .eq('trainer_id', user.id)
      .eq('trainee_id', params.id)
      .single(),
    supabase
      .from('users')
      .select('id, name, email')
      .eq('id', params.id)
      .single(),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!assignment || !trainee) {
    notFound();
  }

  const traineeTyped = trainee as { id: string; name: string; email: string };
  const goals: Goal[] = (goalsData as Goal[] | null) || [];
  const goalIds = goals.map((g) => g.id);

  // activities と reflections は join + 並列で同時取得（旧: シーケンシャル）
  const [activitiesResult, reflectionsResult] =
    goalIds.length > 0
      ? await Promise.all([
          supabase
            .from('activities')
            .select('*')
            .in('goal_id', goalIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('reflections')
            .select('id, activity_id, content, created_at, updated_at, activities!inner(goal_id)')
            .in('activities.goal_id', goalIds)
            .order('created_at', { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

  const activities: Activity[] = (activitiesResult.data as Activity[] | null) || [];
  const reflections: Reflection[] =
    (reflectionsResult.data as Reflection[] | null) || [];

  const activitiesByGoalId: Record<string, Activity[]> = {};
  for (const a of activities) {
    if (!activitiesByGoalId[a.goal_id]) activitiesByGoalId[a.goal_id] = [];
    activitiesByGoalId[a.goal_id].push(a);
  }

  const reflectionsByActivityId: Record<string, Reflection[]> = {};
  for (const r of reflections) {
    if (!reflectionsByActivityId[r.activity_id])
      reflectionsByActivityId[r.activity_id] = [];
    reflectionsByActivityId[r.activity_id].push(r);
  }

  const counts = {
    total: goals.length,
    in_progress: goals.filter((g) => g.status === 'in_progress').length,
    achieved: goals.filter((g) => g.status === 'achieved').length,
    cancelled: goals.filter((g) => g.status === 'cancelled').length,
  };

  const initial = (traineeTyped.name || traineeTyped.email || '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  const lastActivity = activities[0];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 mt-4">
        <Link
          href={`/t/${params.slug}/trainer/dashboard`}
          className="text-sm text-text-secondary hover:text-primary transition-colors"
        >
          ← トレーナーダッシュボードへ
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-bold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary truncate">
              {traineeTyped.name}
            </h1>
            <p className="text-sm text-text-secondary truncate">
              {traineeTyped.email}
            </p>
          </div>
          <Link
            href={`/t/${params.slug}/trainer/trainees/${params.id}/ai`}
            className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:underline whitespace-nowrap"
          >
            AI診断を見る →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">目標</span>
            <span className="font-bold text-text-primary tabular-nums">
              {counts.total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <span className="text-text-secondary">進行中</span>
            <span className="font-bold text-text-primary tabular-nums">
              {counts.in_progress}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-success" />
            <span className="text-text-secondary">達成</span>
            <span className="font-bold text-text-primary tabular-nums">
              {counts.achieved}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-text-secondary/40" />
            <span className="text-text-secondary">中止</span>
            <span className="font-bold text-text-primary tabular-nums">
              {counts.cancelled}
            </span>
          </div>
          {lastActivity && (
            <div className="ml-auto text-xs text-text-secondary">
              最終活動 {formatDate(lastActivity.created_at)}
            </div>
          )}
        </div>

        <Link
          href={`/t/${params.slug}/trainer/trainees/${params.id}/ai`}
          className="mt-4 sm:hidden inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          AI診断を見る →
        </Link>
      </div>

      <TraineeProgressList
        goals={goals}
        activitiesByGoalId={activitiesByGoalId}
        reflectionsByActivityId={reflectionsByActivityId}
      />
    </div>
  );
}
