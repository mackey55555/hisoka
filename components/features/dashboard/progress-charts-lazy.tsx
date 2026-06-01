'use client';

import dynamic from 'next/dynamic';

// recharts は ~400KB 程度あるので、初回ロードを軽くするために
// 別チャンクに分離してクライアント側で遅延読み込みする。
// ProgressCharts 自体が mounted 判定で SSR 中は null を返すため、
// ssr: false を付けても挙動は変わらない（バンドルだけが分離される）。
export const ProgressCharts = dynamic(
  () => import('./progress-charts').then((mod) => mod.ProgressCharts),
  {
    ssr: false,
    loading: () => null,
  }
);
