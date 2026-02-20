'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  role: 'trainee' | 'trainer' | 'admin';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const DashboardIcon = ({ isActive }: { isActive: boolean }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const PlusIcon = ({ isActive }: { isActive: boolean }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  const ListIcon = ({ isActive }: { isActive: boolean }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );

  const HomeIcon = ({ isActive }: { isActive: boolean }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const UsersIcon = ({ isActive }: { isActive: boolean }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const TrainerIcon = ({ isActive }: { isActive: boolean }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const AiIcon = ({ isActive }: { isActive: boolean }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  const traineeMenuItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: DashboardIcon },
    { href: '/dashboard/ai', label: 'AI診断', icon: AiIcon },
    { href: '/goals', label: '目標一覧', icon: ListIcon },
    { href: '/goals/new', label: '新規目標', icon: PlusIcon },
  ];

  const trainerMenuItems = [
    { href: '/trainer/dashboard', label: 'ダッシュボード', icon: DashboardIcon },
  ];

  const adminMenuItems = [
    { href: '/admin', label: '管理画面', icon: HomeIcon },
    { href: '/admin/users', label: 'ユーザー管理', icon: UsersIcon },
    { href: '/admin/trainers', label: 'トレーナー管理', icon: TrainerIcon },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : role === 'trainer' ? trainerMenuItems : traineeMenuItems;

  return (
    <>
      {/* ハンバーガーメニューボタン（モバイルのみ、ヘッダー内に配置） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-0 left-0 z-50 h-16 w-16 flex items-center justify-center bg-surface border-r border-border"
        aria-label="メニューを開く"
      >
        <svg
          className="w-6 h-6 text-text-primary"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* オーバーレイ（モバイルのみ） */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-surface border-r border-border z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-64
          lg:top-0
          flex flex-col
        `}
      >
        {/* ヘッダー部分（サイドバー上部、デスクトップのみ） */}
        <div className="hidden lg:flex h-16 border-b border-border items-center px-6 flex-shrink-0">
          <Link 
            href={role === 'admin' ? '/admin' : role === 'trainer' ? '/trainer/dashboard' : '/dashboard'}
            onClick={() => setIsOpen(false)}
            className="block"
          >
            <h2 className="text-xl font-bold text-primary">Hisoka</h2>
          </Link>
        </div>
        
        {/* メニュー部分 */}
        <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:pt-6 pt-20">
          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${active
                      ? 'bg-primary text-white'
                      : 'text-text-primary hover:bg-background'
                    }
                  `}
                >
                  <span className={active ? 'text-white' : 'text-primary-light'}>
                    <IconComponent isActive={active} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ログアウトボタン（一番下） */}
          <div className="pt-4 mt-auto border-t border-border flex-shrink-0">
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-text-primary hover:bg-background"
            >
              <span className="text-primary-light">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ログアウト確認モーダル */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="ログアウト"
      >
        <div className="space-y-4">
          <p className="text-text-primary">
            ログアウトしますか？
          </p>
          <div className="flex gap-4">
            <Button
              variant="primary"
              onClick={handleLogout}
              className="flex-1"
            >
              ログアウト
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

