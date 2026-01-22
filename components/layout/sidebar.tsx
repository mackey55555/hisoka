'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  role: 'trainee' | 'trainer' | 'admin';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

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

  const traineeMenuItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: DashboardIcon },
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
      {/* ハンバーガーメニューボタン（モバイルのみ） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface border border-border rounded-lg shadow-md"
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
        `}
      >
        {/* ヘッダー部分（サイドバー上部、デスクトップのみ） */}
        <div className="hidden lg:flex h-16 border-b border-border items-center px-6">
          <Link 
            href={role === 'admin' ? '/admin' : role === 'trainer' ? '/trainer/dashboard' : '/dashboard'}
            onClick={() => setIsOpen(false)}
            className="block"
          >
            <h2 className="text-xl font-bold text-primary">Hisoka</h2>
          </Link>
        </div>
        
        {/* メニュー部分 */}
        <div className="p-6 lg:pt-6 pt-20">

          <nav className="space-y-2">
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
        </div>
      </aside>
    </>
  );
}

