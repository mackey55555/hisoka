import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { NavigationLoader } from '@/components/layout/navigation-loader';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  resolveTeamFromSlug,
  setLastTeamSlug,
} from '@/lib/context/current-team';
import { CurrentTeamProvider } from '@/lib/context/current-team-client';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function TeamScopedLayout({ children, params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // resolveTeamFromSlug 内で notFound() を呼ぶ（非メンバーや存在しない slug）
  const team = await resolveTeamFromSlug(slug);

  // 直近開いていたチームを cookie に記憶（Server Component からは書けないケースがあるため try-catch）
  // 書き込み失敗は致命ではない（次回の遷移ヒントが古くなるだけ）
  try {
    await setLastTeamSlug(team.slug);
  } catch {
    // ignore: cookie write not allowed in this render context
  }

  // role に応じて Sidebar を出し分け（個別ページ側でも nested チェックを推奨）
  const sidebarRole = team.role;

  return (
    <CurrentTeamProvider
      value={{
        teamId: team.teamId,
        slug: team.slug,
        name: team.name,
        role: team.role,
        isSuperAdmin: team.isSuperAdmin,
      }}
    >
      <Header withSidebar />
      <div className="flex min-h-screen">
        <Sidebar role={sidebarRole} teamSlug={team.slug} />
        <main className="flex-1 lg:ml-64 min-h-screen pt-16 lg:pt-16">
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <NavigationLoader />
      </Suspense>
    </CurrentTeamProvider>
  );
}
