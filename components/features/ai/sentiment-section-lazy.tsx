'use client';

import dynamic from 'next/dynamic';

// recharts を遅延読み込みして初回ロードを軽くする
export const SentimentSection = dynamic(
  () => import('./sentiment-section').then((mod) => mod.SentimentSection),
  {
    ssr: false,
    loading: () => null,
  }
);
