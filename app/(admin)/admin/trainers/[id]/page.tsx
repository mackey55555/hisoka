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

  // 各トレーニーの現在の紐付け状況を取得（どのトレーナーに紐付けられているか）
  const { data: allAssignments } = await supabase
    .from('trainer_trainees')
    .select('trainee_id, trainer_id');

  // trainee_idをキーにしたオブジェクトを作成（Mapはシリアライズできないため）
  const assignmentMap: Record<string, string> = {};
  allAssignments?.forEach(assignment => {
    assignmentMap[assignment.trainee_id] = assignment.trainer_id;
  });

  return (
    <TrainerDetail
      trainer={trainer}
      allTrainees={allTrainees || []}
      assignedTraineeIds={assignedTraineeIds}
      assignmentMap={assignmentMap}
    />
  );
}

