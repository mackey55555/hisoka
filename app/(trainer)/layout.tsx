import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function TrainerLayout({
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

  if (!userRow || roleRow?.name !== 'trainer') {
    redirect('/login');
  }

  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        <Sidebar role="trainer" />
        <main className="flex-1 lg:ml-64 min-h-screen pt-16 lg:pt-16">{children}</main>
      </div>
    </>
  );
}

