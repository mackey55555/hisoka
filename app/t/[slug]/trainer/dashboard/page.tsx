import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getAllTraineesLatestDiagnosis } from '@/lib/actions/ai';
import { TraineeAiCard } from '@/components/features/ai/trainee-ai-card';

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

  // AI診断データを取得
  const { data: aiData } = await getAllTraineesLatestDiagnosis();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6 mt-4">
        トレーナーダッシュボード
      </h1>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          担当トレーニー一覧
        </h2>
        {trainees.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {trainees.map((trainee: any) => {
              const aiEntry = aiData?.find((d: any) => d.trainee.id === trainee.id);
              return (
                <TraineeAiCard
                  key={trainee.id}
                  trainee={trainee}
                  diagnosis={aiEntry?.diagnosis || null}
                />
              );
            })}
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

