import { notFound } from 'next/navigation';
import { getGoalById } from '@/lib/actions/goals';
import { getActivitiesByGoalId } from '@/lib/actions/activities';
import { getReflectionsByActivityIds } from '@/lib/actions/reflections';
import { GoalDetail } from '@/components/features/goals/goal-detail';
import type { Activity, Reflection } from '@/types';

export default async function GoalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // 並列で目標と活動記録を取得
  const [goalResult, activitiesResult] = await Promise.all([
    getGoalById(params.id),
    getActivitiesByGoalId(params.id),
  ]);

  const { data: goal, error } = goalResult;

  if (error || !goal) {
    notFound();
  }

  const activities: Activity[] = (activitiesResult.data || []) as Activity[];
  
  // 活動記録が存在する場合、全ての振り返りを一度に取得
  const activityIds = activities.map(a => a.id);
  const reflectionsResult = activityIds.length > 0
    ? await getReflectionsByActivityIds(activityIds)
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

