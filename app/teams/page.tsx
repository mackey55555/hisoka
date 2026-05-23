import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { listMyTeams, getIsSuperAdmin } from '@/lib/context/current-team';

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [teams, isSuperAdmin] = await Promise.all([
    listMyTeams(),
    getIsSuperAdmin(),
  ]);

  if (teams.length === 0 && !isSuperAdmin) {
    redirect('/no-team');
  }

  return (
    <>
      <Header />
      <main className="min-h-screen px-4 pt-24 pb-12">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-text-primary mb-6">
            所属チームを選択
          </h1>

          {teams.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {teams.map((t) => (
                <Link key={t.id} href={`/t/${t.slug}/dashboard`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-bold text-text-primary mb-2">
                      {t.name}
                    </h2>
                    <p className="text-sm text-text-secondary">役割: {t.role}</p>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">所属チームはありません。</p>
          )}

          {isSuperAdmin && (
            <div className="mt-10">
              <Link href="/super-admin">
                <Card className="hover:shadow-md transition-shadow">
                  <h2 className="text-lg font-bold text-primary">
                    Super Admin ダッシュボード
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    全テナントの管理
                  </p>
                </Card>
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
