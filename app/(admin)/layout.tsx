import { Header } from '@/components/layout/header';
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

  const { data: roleRow } = userRow
    ? await supabase.from('roles').select('name').eq('id', userRow.role_id).single()
    : { data: null };

  if (!userRow || roleRow?.name !== 'admin') {
    redirect('/login');
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
    </>
  );
}

