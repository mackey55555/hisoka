'use client';

import { useEffect } from 'react';

/**
 * Service Worker を手動で登録するクライアントコンポーネント。
 *
 * next-pwa の `register: true` オプションは Next.js Pages Router 用に
 * 設計されており、App Router では自動登録の script が挿入されない。
 * このコンポーネントを root layout に置くことで明示的に登録する。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // 開発時のデバッグログ。コンソールに出ると追跡しやすい。
        // eslint-disable-next-line no-console
        console.log('[PWA] Service Worker registered:', registration.scope);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[PWA] Service Worker registration failed:', err);
      });
  }, []);

  return null;
}
