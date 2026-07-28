import { redirect } from 'next/navigation';
import { getMySkillProfile } from '@/lib/actions/ai';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { MySkillCard } from '@/components/features/dashboard/my-skill-card';

export default async function SkillsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const team = await resolveTeamFromSlug(slug);
  if (team.role === 'admin') {
    redirect(`/t/${slug}/admin`);
  }

  const { data: profile } = await getMySkillProfile(slug);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mt-4">
        <MySkillCard teamSlug={slug} initial={profile ?? null} />
      </div>
    </div>
  );
}
