'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';

export const Header = () => {
  const pathname = usePathname();

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
        <div className="h-full flex items-center gap-3 px-4">
          {/* ハンバーガーメニューボタン用のスペース（Sidebarコンポーネントで表示） */}
          <div className="w-10" />
          <Link href="/dashboard" className="text-xl font-bold text-primary flex-1">
            Hisoka
          </Link>
        </div>
      </header>
      
      {/* デスクトップ用ヘッダー（サイドバーの右側のみ） */}
      <header className="hidden lg:block border-b border-border bg-surface fixed top-0 right-0 lg:left-64 z-30 h-16">
        <div className="h-full flex items-center justify-end px-4">
          {/* ログアウトボタンはサイドメニューに移動したため、ここには何も表示しない */}
        </div>
      </header>
    </>
  );
};

