import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { getGoals } from '@/lib/actions/goals';
import { formatDate, isDeadlineNear, isDeadlinePassed } from '@/lib/utils/helpers';
import { GoalsList } from '@/components/features/goals/goals-list';

export default async function GoalsPage() {
  const { data: goals } = await getGoals();

  const goalsArray = (goals as Array<{ id: string; content: string; deadline: string; status: string; created_at: string }> | null) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-text-primary">目標一覧</h1>
      </div>

      <GoalsList initialGoals={goalsArray} />
    </div>
  );
}

