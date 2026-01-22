import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TrainerDetail } from '@/components/features/admin/trainer-detail';

export default async function TrainerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  
  // ロールIDを取得
  const { data: trainerRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'trainer')
    .single();

  // トレーナー情報を取得
  const { data: trainer } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('id', params.id)
    .eq('role_id', trainerRole?.id || '')
    .single();

  if (!trainer) {
    notFound();
  }

  // 担当トレーニーを取得
  const { data: assignments } = await supabase
    .from('trainer_trainees')
    .select('trainee_id')
    .eq('trainer_id', params.id);

  const assignedTraineeIds = assignments?.map(a => a.trainee_id) || [];

  // ロールIDを取得
  const { data: traineeRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'trainee')
    .single();

  // 全トレーニーを取得
  const { data: allTrainees } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('role_id', traineeRole?.id || '')
    .order('name');

  return (
    <TrainerDetail
      trainer={trainer}
      allTrainees={allTrainees || []}
      assignedTraineeIds={assignedTraineeIds}
    />
  );
}

