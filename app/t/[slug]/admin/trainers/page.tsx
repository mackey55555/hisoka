import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils/helpers';
import { listTeamUsers } from '@/lib/actions/admin';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolveTeamFromSlug } from '@/lib/context/current-team';

export default async function TrainersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);
  const { data: members } = await listTeamUsers(slug);
  const trainers = members.filter((m) => m.role === 'trainer');

  const admin = getAdminClient();
  const trainersWithCounts = await Promise.all(
    trainers.map(async (trainer) => {
      const { count } = await admin
        .from('trainer_trainees')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainer.id)
        .eq('team_id', team.teamId);
      return { ...trainer, traineeCount: count || 0 };
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
            <Link key={trainer.id} href={`/t/${slug}/admin/trainers/${trainer.id}`}>
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
