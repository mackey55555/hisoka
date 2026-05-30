import { getGoals } from '@/lib/actions/goals';
import { getMyMonthlyReflection } from '@/lib/actions/monthly-reflections';
import { GoalsList } from '@/components/features/goals/goals-list';
import { MonthlyReflectionCard } from '@/components/features/dashboard/monthly-reflection-card';

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const [{ data: goals }, monthlyReflectionResult] = await Promise.all([
    getGoals(slug),
    getMyMonthlyReflection(slug, thisYear, thisMonth),
  ]);

  const goalsArray =
    (goals as Array<{
      id: string;
      content: string;
      deadline: string;
      status: string;
      created_at: string;
    }> | null) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-text-primary">目標一覧</h1>
      </div>

      <MonthlyReflectionCard
        teamSlug={slug}
        year={thisYear}
        month={thisMonth}
        initial={monthlyReflectionResult.data ?? null}
      />

      <GoalsList initialGoals={goalsArray} />
    </div>
  );
}
