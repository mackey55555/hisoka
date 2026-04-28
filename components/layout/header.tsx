import Link from 'next/link';
import { Button } from '../ui/button';
import { createClient } from '@/lib/supabase/server';
import { listMyTeams, getIsSuperAdmin } from '@/lib/context/current-team';
import { HeaderTeamSwitcher } from './header-team-switcher';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 未ログイン: シンプルなヘッダーのみ
  if (!user) {
    return (
      <header className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Hisoka
          </Link>
          <Link href="/login">
            <Button variant="primary">ログイン</Button>
          </Link>
        </div>
      </header>
    );
  }

  const [teams, isSuperAdmin] = await Promise.all([
    listMyTeams(),
    getIsSuperAdmin(),
  ]);

  return (
    <>
      {/* モバイル用ヘッダー（全幅） */}
      <header className="lg:hidden border-b border-border bg-surface fixed top-0 left-0 right-0 z-30 h-16">
        <div className="h-full flex items-center gap-3 px-4">
          {/* ハンバーガーメニュー用のスペース */}
          <div className="w-10" />
          <Link href="/" className="text-xl font-bold text-primary flex-1">
            Hisoka
          </Link>
          <HeaderTeamSwitcher teams={teams} isSuperAdmin={isSuperAdmin} compact />
        </div>
      </header>

      {/* デスクトップ用ヘッダー */}
      <header className="hidden lg:block border-b border-border bg-surface fixed top-0 right-0 lg:left-64 z-30 h-16">
        <div className="h-full flex items-center justify-end gap-3 px-4">
          <HeaderTeamSwitcher teams={teams} isSuperAdmin={isSuperAdmin} />
        </div>
      </header>
    </>
  );
}
