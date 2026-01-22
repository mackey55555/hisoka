import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function TrainerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 担当トレーニーを取得
  const { data: assignments } = await supabase
    .from('trainer_trainees')
    .select('trainee_id, trainee:users!trainer_trainees_trainee_id_fkey(id, name, email)')
    .eq('trainer_id', user.id);

  const trainees =
    (assignments ?? [])
      .map((a: any) => a.trainee)
      .filter((t: any): t is { id: string; name: string; email: string } => Boolean(t?.id));
  const hasAssignmentsButNoProfiles = (assignments?.length || 0) > 0 && trainees.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        トレーナーダッシュボード
      </h1>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          担当トレーニー一覧
        </h2>
        {trainees.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {trainees.map((trainee: any) => (
              <Link key={trainee.id} href={`/trainer/trainees/${trainee.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    {trainee.name}
                  </h3>
                  <p className="text-sm text-text-secondary">{trainee.email}</p>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">
              {hasAssignmentsButNoProfiles
                ? '担当トレーニーは存在しますが、プロフィール情報を取得できません（RLS設定を確認してください）'
                : '担当トレーニーがまだいません'}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

