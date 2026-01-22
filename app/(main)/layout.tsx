import { Header } from '@/components/layout/header';
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

  const { data: roleRow } = await supabase
    .from('roles')
    .select('name')
    .eq('id', userRow.role_id)
    .single();

  const role = roleRow?.name;

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
      <main className="min-h-screen">{children}</main>
    </>
  );
}

