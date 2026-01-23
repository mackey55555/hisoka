'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationLoader() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    // 初回レンダリング時は何もしない
    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname;
      return;
    }

    // パス名が変更された場合（遷移が発生）
    if (prevPathnameRef.current !== pathname) {
      // 遷移が完了したらローディングを非表示
      setIsNavigating(false);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  // リンククリック時にローディングを表示
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      
      if (link) {
        const href = link.getAttribute('href');
        // 外部リンクやアンカーリンクは除外
        if (href && !href.startsWith('http') && !href.startsWith('#') && href !== pathname) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [pathname]);

  if (!isNavigating) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-opacity duration-200">
      <div className="bg-surface border border-border rounded-full shadow-lg p-3 flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
        <span className="text-sm text-text-secondary">読み込み中...</span>
      </div>
    </div>
  );
}

