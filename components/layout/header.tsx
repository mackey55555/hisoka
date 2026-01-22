'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export const Header = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isAuthPage = pathname?.includes('/login') || pathname === '/';

  if (isAuthPage) {
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

  return (
    <>
      {/* モバイル用ヘッダー（全幅） */}
      <header className="lg:hidden border-b border-border bg-surface fixed top-0 left-0 right-0 z-30 h-16">
        <div className="h-full flex items-center justify-between px-4">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            Hisoka
          </Link>
          <Button variant="ghost" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </header>
      
      {/* デスクトップ用ヘッダー（サイドバーの右側のみ） */}
      <header className="hidden lg:block border-b border-border bg-surface fixed top-0 right-0 lg:left-64 z-30 h-16">
        <div className="h-full flex items-center justify-end px-4">
          <Button variant="ghost" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </header>
    </>
  );
};

