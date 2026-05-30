import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { MeForm } from '@/components/features/me/me-form';

const ROLE_LABELS: Record<string, string> = {
  admin: 'チーム管理者',
  trainer: 'トレーナー',
  trainee: 'トレーニー',
};

export default async function MePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single();

  const userDataTyped = userData as { name: string; email: string } | null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-text-primary mb-2">マイページ</h1>
        <p className="text-sm text-text-secondary">
          アカウントの基本情報を変更できます
        </p>
      </div>

      <MeForm
        teamSlug={slug}
        currentName={userDataTyped?.name || ''}
        currentEmail={user.email || ''}
        roleLabel={ROLE_LABELS[team.role] || team.role}
      />
    </div>
  );
}
