'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import type { AiDiagnosis, TraitKey } from '@/types';
import { TRAIT_LABELS } from '@/types';

interface TraineeAiCardProps {
  trainee: { id: string; name: string };
  diagnosis: AiDiagnosis | null;
}

export function TraineeAiCard({ trainee, diagnosis }: TraineeAiCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!diagnosis) {
    return (
      <Card>
        <h3 className="text-lg font-medium text-text-primary mb-2">{trainee.name}</h3>
        <p className="text-sm text-text-secondary">AI診断はまだありません</p>
      </Card>
    );
  }

  const traitKeys = Object.keys(TRAIT_LABELS) as TraitKey[];
  const chartData = traitKeys.map((key) => ({
    trait: TRAIT_LABELS[key],
    score: diagnosis.personality_traits[key]?.score ?? 0,
  }));

  const score = Number(diagnosis.sentiment_score);
  const summaryPreview = diagnosis.summary.length > 60
    ? diagnosis.summary.slice(0, 60) + '...'
    : diagnosis.summary;

  return (
    <Link href={`/trainer/trainees/${trainee.id}/ai`}>
      <Card className="hover:shadow-md transition-shadow">
        <h3 className="text-lg font-medium text-text-primary mb-2">{trainee.name}</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-text-secondary">ネガポジ:</span>
          <span className={`text-sm font-medium ${score >= 0 ? 'text-success' : 'text-error'}`}>
            {score > 0 ? '+' : ''}{score.toFixed(2)}
          </span>
        </div>
        {mounted && (
          <ResponsiveContainer width="100%" height={150}>
            <RadarChart data={chartData}>
              <PolarGrid stroke="#D4CFC7" />
              <PolarAngleAxis dataKey="trait" tick={{ fontSize: 9, fill: '#6B6B6B' }} />
              <Radar dataKey="score" stroke="#5D7A6E" fill="#5D7A6E" fillOpacity={0.2} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        )}
        <p className="text-sm text-text-secondary mt-2">{summaryPreview}</p>
        <p className="text-xs text-primary mt-2 font-medium">AI詳細を見る →</p>
      </Card>
    </Link>
  );
}
