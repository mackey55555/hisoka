import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getGoals } from '@/lib/actions/goals';
import { createClient } from '@/lib/supabase/server';
import { ProgressCharts } from '@/components/features/dashboard/progress-charts';
import { GoalsListSection } from '@/components/features/dashboard/goals-list-section';

export default async function DashboardPage() {
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

  const { data: goals } = await getGoals();

  const goalsArray = (goals as Array<{ id: string; content: string; deadline: string; status: string; created_at: string }> | null) || [];
  const inProgressGoals = goalsArray.filter((g) => g.status === 'in_progress');
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  // 今月の活動数を取得
  const { data: activitiesThisMonth } = await supabase
    .from('activities')
    .select('id, created_at, goals!inner(user_id)')
    .eq('goals.user_id', user.id)
    .gte('created_at', new Date(thisYear, thisMonth, 1).toISOString())
    .lt('created_at', new Date(thisYear, thisMonth + 1, 1).toISOString());

  // グラフ用の全活動データを取得（過去6ヶ月）
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data: allActivities } = await supabase
    .from('activities')
    .select('created_at, goals!inner(user_id)')
    .eq('goals.user_id', user.id)
    .gte('created_at', sixMonthsAgo.toISOString());

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          こんにちは、{userDataTyped?.name || 'ユーザー'}さん
        </h1>
        <p className="text-text-secondary">今日も頑張りましょう</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="text-lg font-bold text-text-primary mb-2">
            進行中の目標
          </h2>
          <p className="text-3xl font-bold text-primary">
            {inProgressGoals.length}
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-bold text-text-primary mb-2">
            今月の活動
          </h2>
          <p className="text-3xl font-bold text-primary">
            {activitiesThisMonth?.length || 0}
          </p>
        </Card>
      </div>

      {/* 進捗可視化グラフ */}
      {(goalsArray.length > 0 || (allActivities && allActivities.length > 0)) && (
        <ProgressCharts 
          goals={goalsArray} 
          activities={(allActivities as Array<{ created_at: string }> | null)?.map(a => ({ created_at: a.created_at })) || []} 
        />
      )}

      <GoalsListSection goals={goalsArray} />

      <div className="text-center">
        <Link href="/goals/new">
          <Button variant="primary" className="px-8">
            + 新規目標
          </Button>
        </Link>
      </div>
    </div>
  );
}

