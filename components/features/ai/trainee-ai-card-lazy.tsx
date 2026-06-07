'use client';

import dynamic from 'next/dynamic';

// recharts を遅延読み込みして初回ロードを軽くする
export const TraineeAiCard = dynamic(
  () => import('./trainee-ai-card').then((mod) => mod.TraineeAiCard),
  {
    ssr: false,
    loading: () => null,
  }
);
