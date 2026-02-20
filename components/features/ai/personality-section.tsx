'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { AiDiagnosis, TraitKey } from '@/types';
import { TRAIT_LABELS } from '@/types';

interface PersonalitySectionProps {
  diagnosis: AiDiagnosis;
}

export function PersonalitySection({ diagnosis }: PersonalitySectionProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const traits = diagnosis.personality_traits;
  const traitKeys = Object.keys(TRAIT_LABELS) as TraitKey[];

  const chartData = traitKeys.map((key) => ({
    trait: TRAIT_LABELS[key],
    score: traits[key]?.score ?? 0,
  }));

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-text-primary mb-4">
        パーソナリティ特性
      </h3>

      {/* レーダーチャート */}
      {mounted && (
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid stroke="#D4CFC7" />
              <PolarAngleAxis dataKey="trait" tick={{ fontSize: 12, fill: '#3D3D3D' }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#6B6B6B' }} />
              <Radar
                dataKey="score"
                stroke="#5D7A6E"
                fill="#5D7A6E"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 特性一覧 */}
      <div className="grid grid-cols-2 gap-2">
        {traitKeys.map((key) => {
          const trait = traits[key];
          if (!trait) return null;
          return (
            <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-background">
              <span className="text-sm text-text-primary">{TRAIT_LABELS[key]}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{trait.score}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    trait.level === 'HIGH'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {trait.level}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 注意書き */}
      <p className="text-xs text-text-secondary mt-4 p-3 bg-background rounded-lg">
        AIによる推定値です。正式な心理検査とは異なります。
      </p>
    </Card>
  );
}
