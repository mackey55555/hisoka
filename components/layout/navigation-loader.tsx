'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationLoader() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathnameRef = useRef<string | null>(null);

  // pathname が変わったら遷移完了 → ローディング解除
  useEffect(() => {
    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname;
      return;
    }
    if (prevPathnameRef.current !== pathname) {
      setIsNavigating(false);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  // 想定外に長引いた時の安全弁。15秒で強制的にローディング解除。
  useEffect(() => {
    if (!isNavigating) return;
    const timeout = setTimeout(() => setIsNavigating(false), 15000);
    return () => clearTimeout(timeout);
  }, [isNavigating]);

  // 内部リンクのクリックでローディング開始
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('http')) return;
      if (href.startsWith('#')) return;
      if (href === pathname) return;
      setIsNavigating(true);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/40 backdrop-blur-[1px] flex items-center justify-center cursor-wait"
      aria-busy="true"
      aria-live="polite"
      // クリックを吸収する（下のリンク・ボタンに伝播させない）
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="bg-surface border border-border rounded-full shadow-lg px-4 py-2.5 flex items-center gap-2.5">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        <span className="text-sm text-text-secondary">読み込み中...</span>
      </div>
    </div>
  );
}
