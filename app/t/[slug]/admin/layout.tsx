import { notFound } from 'next/navigation';
import { resolveTeamFromSlug } from '@/lib/context/current-team';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function AdminScopedLayout({ children, params }: Props) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);
  if (team.role !== 'admin' && !team.isSuperAdmin) notFound();
  return <>{children}</>;
}
