import { notFound, redirect } from 'next/navigation';
import { getGoalById } from '@/lib/actions/goals';
import { getActivitiesByGoalId } from '@/lib/actions/activities';
import { formatDate, formatDateTime } from '@/lib/utils/helpers';
import { GoalDetail } from '@/components/features/goals/goal-detail';

export default async function GoalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: goal, error } = await getGoalById(params.id);

  if (error || !goal) {
    notFound();
  }

  const { data: activities } = await getActivitiesByGoalId(params.id);

  return <GoalDetail goal={goal} activities={activities || []} />;
}

