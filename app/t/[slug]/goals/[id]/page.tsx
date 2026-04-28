import { notFound } from 'next/navigation';
import { getGoalById } from '@/lib/actions/goals';
import { getActivitiesByGoalId } from '@/lib/actions/activities';
import { getReflectionsByActivityIds } from '@/lib/actions/reflections';
import { GoalDetail } from '@/components/features/goals/goal-detail';
import type { Activity, Reflection } from '@/types';

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const [goalResult, activitiesResult] = await Promise.all([
    getGoalById(slug, id),
    getActivitiesByGoalId(slug, id),
  ]);

  const { data: goal, error } = goalResult;

  if (error || !goal) {
    notFound();
  }

  const activities: Activity[] = (activitiesResult.data || []) as Activity[];
  
  // 活動記録が存在する場合、全ての振り返りを一度に取得
  const activityIds = activities.map(a => a.id);
  const reflectionsResult = activityIds.length > 0
    ? await getReflectionsByActivityIds(slug, activityIds)
    : { data: [] };

  const allReflections: Reflection[] = (reflectionsResult.data || []) as Reflection[];

  // 活動記録IDをキーとした振り返りのマップを作成
  const reflectionsMap: Record<string, Reflection[]> = {};
  allReflections.forEach(reflection => {
    if (!reflectionsMap[reflection.activity_id]) {
      reflectionsMap[reflection.activity_id] = [];
    }
    reflectionsMap[reflection.activity_id].push(reflection);
  });

  return (
    <GoalDetail
      goal={goal}
      activities={activities}
      initialReflections={reflectionsMap}
    />
  );
}

