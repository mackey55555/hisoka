import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { NavigationLoader } from '@/components/layout/navigation-loader';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // ユーザーのロールを確認（JOINを避けて安定化）
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    // ユーザーデータが存在しない場合は、サインアップページに誘導
    redirect('/signup');
  }

  const userRowTyped = userRow as { role_id: string };
  const { data: roleRow } = await supabase
    .from('roles')
    .select('name')
    .eq('id', userRowTyped.role_id)
    .single();

  const roleRowTyped = roleRow as { name: string } | null;
  const role = roleRowTyped?.name;

  // トレーナーや管理者の場合は適切なページにリダイレクト
  if (role === 'trainer') {
    redirect('/trainer/dashboard');
  }
  if (role === 'admin') {
    redirect('/admin');
  }

  // トレーニーの場合のみこのレイアウトを表示
  if (role !== 'trainee') {
    redirect('/login');
  }

  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        <Sidebar role="trainee" />
        <main className="flex-1 lg:ml-64 min-h-screen pt-16 lg:pt-16">{children}</main>
      </div>
      <Suspense fallback={null}>
        <NavigationLoader />
      </Suspense>
    </>
  );
}

