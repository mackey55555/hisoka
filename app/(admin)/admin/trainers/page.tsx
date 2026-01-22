import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/helpers';

export default async function TrainersPage() {
  const supabase = await createClient();
  
  // ロールIDを取得
  const { data: trainerRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'trainer')
    .single();

  // トレーナー一覧を取得
  const { data: trainers } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('role_id', trainerRole?.id || '')
    .order('created_at', { ascending: false });

  // 各トレーナーの担当トレーニー数を取得
  const trainersWithCounts = await Promise.all(
    (trainers || []).map(async (trainer) => {
      const { count } = await supabase
        .from('trainer_trainees')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainer.id);
      
      return {
        ...trainer,
        traineeCount: count || 0,
      };
    })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6 mt-4">
        トレーナー管理
      </h1>

      {trainersWithCounts.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {trainersWithCounts.map((trainer) => (
            <Link key={trainer.id} href={`/admin/trainers/${trainer.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {trainer.name}
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  {trainer.email}
                </p>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>担当トレーニー: {trainer.traineeCount}人</span>
                  <span>登録日: {formatDateTime(trainer.created_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-8">
            トレーナーが存在しません
          </p>
        </Card>
      )}
    </div>
  );
}

