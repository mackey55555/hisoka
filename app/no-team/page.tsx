import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { listMyTeams, getIsSuperAdmin } from '@/lib/context/current-team';

export default async function NoTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [teams, isSuperAdmin] = await Promise.all([
    listMyTeams(),
    getIsSuperAdmin(),
  ]);

  // 所属がある or SuperAdmin の場合はここにいるべきではない
  if (teams.length > 0) redirect(`/t/${teams[0].slug}/dashboard`);
  if (isSuperAdmin) redirect('/super-admin');

  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            チームに所属していません
          </h1>
          <p className="text-text-secondary mb-2">
            管理者から招待メールが届いていないかご確認ください。
          </p>
          <p className="text-text-secondary mb-8">
            届いていない場合は運営までご連絡ください。
          </p>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary">
              ログアウト
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
