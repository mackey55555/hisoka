import { notFound } from 'next/navigation';
import { resolveTeamFromSlug } from '@/lib/context/current-team';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function TrainerScopedLayout({ children, params }: Props) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);
  // admin もトレーナー画面に入れる（サブセット権限の包含）
  if (team.role !== 'trainer' && team.role !== 'admin' && !team.isSuperAdmin) {
    notFound();
  }
  return <>{children}</>;
}
