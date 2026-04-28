import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { AcceptForm } from './accept-form';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;

  const admin = getAdminClient();
  const { data: invRow } = await admin
    .from('team_invitations' as any)
    .select(
      'id, team_id, email, role, expires_at, accepted_at, teams:team_id ( slug, name )'
    )
    .eq('token', token)
    .maybeSingle();

  if (!invRow) {
    return (
      <ErrorView title="招待が見つかりません" message="リンクが無効か、削除されています。" />
    );
  }

  const inv = invRow as any;
  const team = inv.teams as { slug: string; name: string } | null;

  if (inv.accepted_at) {
    if (team) redirect(`/t/${team.slug}/dashboard`);
    return <ErrorView title="受諾済みです" message="この招待は既に受諾されています。" />;
  }

  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return (
      <ErrorView
        title="招待の有効期限が切れています"
        message="管理者に再招待を依頼してください。"
      />
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-4">チーム招待</h1>
        <p className="mb-6">
          <strong>{team?.name ?? 'チーム'}</strong> に <strong>{inv.role}</strong> として招待されています。
        </p>
        <p className="mb-6 text-text-secondary text-sm">
          受諾するにはログインしてください。
        </p>
        <Link href={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}>
          <Button variant="primary">ログインして受諾する</Button>
        </Link>
      </Shell>
    );
  }

  const userEmail = (user.email ?? '').toLowerCase();
  const inviteEmail = (inv.email ?? '').toLowerCase();

  if (userEmail !== inviteEmail) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-4">別のアカウントでログインしてください</h1>
        <p className="mb-2">
          現在 <strong>{user.email}</strong> でログイン中です。
        </p>
        <p className="mb-6">
          この招待は <strong>{inv.email}</strong> 宛のため、いったんログアウトして該当アカウントで再ログインしてください。
        </p>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="primary">
            ログアウトしてログイン画面へ
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-4">チーム招待</h1>
      <p className="mb-6">
        <strong>{team?.name ?? 'チーム'}</strong> に <strong>{inv.role}</strong> として招待されています。
      </p>
      <p className="mb-6 text-text-secondary text-sm">
        受諾するとこのチームで活動を開始できます。
      </p>
      <AcceptForm token={token} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border rounded-lg p-8">
          {children}
        </div>
      </main>
    </>
  );
}

function ErrorView({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-4 text-error">{title}</h1>
      <p className="mb-6 text-text-secondary">{message}</p>
      <Link href="/login">
        <Button variant="secondary">ログインに戻る</Button>
      </Link>
    </Shell>
  );
}
