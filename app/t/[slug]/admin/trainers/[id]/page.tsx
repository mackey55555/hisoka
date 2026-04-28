import { notFound } from 'next/navigation';
import { TrainerDetail } from '@/components/features/admin/trainer-detail';
import { listTeamUsers } from '@/lib/actions/admin';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolveTeamFromSlug } from '@/lib/context/current-team';

export default async function TrainerDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const team = await resolveTeamFromSlug(slug);

  const { data: members } = await listTeamUsers(slug);
  const trainer = members.find((m) => m.id === id && m.role === 'trainer');
  if (!trainer) notFound();

  const trainees = members.filter((m) => m.role === 'trainee');

  const admin = getAdminClient();
  const { data: assignmentsRaw } = await admin
    .from('trainer_trainees')
    .select('trainee_id, trainer_id')
    .eq('team_id', team.teamId);
  const allAssignments = (assignmentsRaw as Array<{ trainee_id: string; trainer_id: string }> | null) ?? [];

  const assignedTraineeIds = allAssignments
    .filter((a) => a.trainer_id === id)
    .map((a) => a.trainee_id);

  const assignmentMap: Record<string, string> = {};
  allAssignments.forEach((a) => {
    assignmentMap[a.trainee_id] = a.trainer_id;
  });

  return (
    <TrainerDetail
      trainer={trainer}
      allTrainees={trainees}
      assignedTraineeIds={assignedTraineeIds}
      assignmentMap={assignmentMap}
    />
  );
}
