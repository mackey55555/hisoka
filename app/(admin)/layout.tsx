import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { NavigationLoader } from '@/components/layout/navigation-loader';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ユーザーのロールを確認
  const { data: userRow } = await supabase
    .from('users')
    .select('role_id')
    .eq('id', user.id)
    .single();

  const userRowTyped = userRow as { role_id: string } | null;
  const { data: roleRow } = userRowTyped
    ? await supabase.from('roles').select('name').eq('id', userRowTyped.role_id).single()
    : { data: null };

  const roleRowTyped = roleRow as { name: string } | null;
  if (!userRow || roleRowTyped?.name !== 'admin') {
    redirect('/login');
  }

  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        <Sidebar role="admin" />
        <main className="flex-1 lg:ml-64 min-h-screen pt-16 lg:pt-16">{children}</main>
      </div>
      <Suspense fallback={null}>
        <NavigationLoader />
      </Suspense>
    </>
  );
}

