'use client';

import dynamic from 'next/dynamic';

// recharts を遅延読み込みして初回ロードを軽くする
export const PersonalitySection = dynamic(
  () => import('./personality-section').then((mod) => mod.PersonalitySection),
  {
    ssr: false,
    loading: () => null,
  }
);
