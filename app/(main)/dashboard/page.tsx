import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getGoals } from '@/lib/actions/goals';
import { formatDate, isDeadlineNear, isDeadlinePassed } from '@/lib/utils/helpers';
import { createClient } from '@/lib/supabase/server';
import { ProgressCharts } from '@/components/features/dashboard/progress-charts';

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

      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">目標一覧</h2>
        {goalsArray.length > 0 ? (
          <div className="space-y-4">
            {goalsArray.map((goal) => {
              const near = isDeadlineNear(goal.deadline);
              const passed = isDeadlinePassed(goal.deadline);
              
              return (
                <Link key={goal.id} href={`/goals/${goal.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-text-primary mb-2 break-words">
                          {goal.content}
                        </h3>
                        <div className="flex items-center gap-2 sm:gap-4 text-sm text-text-secondary flex-wrap">
                          <span className="whitespace-nowrap">期限: {formatDate(goal.deadline)}</span>
                          <span
                            className={`px-2 py-1 rounded whitespace-nowrap ${
                              goal.status === 'achieved'
                                ? 'bg-success/20 text-success'
                                : goal.status === 'cancelled'
                                ? 'bg-text-secondary/20 text-text-secondary'
                                : passed
                                ? 'bg-error/20 text-error'
                                : near
                                ? 'bg-warning/20 text-warning'
                                : 'bg-primary/20 text-primary'
                            }`}
                          >
                            {goal.status === 'achieved'
                              ? '達成'
                              : goal.status === 'cancelled'
                              ? '中止'
                              : passed
                              ? '期限切れ'
                              : near
                              ? '期限間近'
                              : '進行中'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">
              まだ目標がありません
            </p>
          </Card>
        )}
      </div>

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

