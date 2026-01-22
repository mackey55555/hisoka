import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/helpers';
import { ActivityList } from '@/components/features/activities/activity-list';

export default async function TraineeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // トレーナーがこのトレーニーを担当しているか確認
  const { data: assignment } = await supabase
    .from('trainer_trainees')
    .select('trainee_id')
    .eq('trainer_id', user.id)
    .eq('trainee_id', params.id)
    .single();

  if (!assignment) {
    notFound();
  }

  // トレーニー情報を取得
  const { data: trainee } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', params.id)
    .single();

  if (!trainee) {
    notFound();
  }

  // トレーニーの目標を取得
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {trainee.name}さんの進捗
        </h1>
        <p className="text-text-secondary">{trainee.email}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">目標一覧</h2>
        {goals && goals.length > 0 ? (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    {goal.content}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span>期限: {formatDate(goal.deadline)}</span>
                    <span
                      className={`px-2 py-1 rounded ${
                        goal.status === 'achieved'
                          ? 'bg-success/20 text-success'
                          : goal.status === 'cancelled'
                          ? 'bg-text-secondary/20 text-text-secondary'
                          : 'bg-primary/20 text-primary'
                      }`}
                    >
                      {goal.status === 'achieved'
                        ? '達成'
                        : goal.status === 'cancelled'
                        ? '中止'
                        : '進行中'}
                    </span>
                  </div>
                </div>

                <ActivityList goalId={goal.id} />
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">
              まだ目標がありません
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

