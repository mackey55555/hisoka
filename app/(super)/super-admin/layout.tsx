import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getIsSuperAdmin } from '@/lib/context/current-team';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await getIsSuperAdmin())) notFound();

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/super-admin" className="text-xl font-bold text-primary">
            Hisoka <span className="text-sm font-normal text-text-secondary">/ Super Admin</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>
      <main className="min-h-screen bg-background">{children}</main>
    </>
  );
}
