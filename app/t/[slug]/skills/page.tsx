import { getMySkillProfile } from '@/lib/actions/ai';
import { MySkillCard } from '@/components/features/dashboard/my-skill-card';

export default async function SkillsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // admin も本人として密かなスキルを利用可（リダイレクトしない）
  const { data: profile } = await getMySkillProfile(slug);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mt-4">
        <MySkillCard teamSlug={slug} initial={profile ?? null} />
      </div>
    </div>
  );
}
