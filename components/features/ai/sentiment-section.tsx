'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AiDiagnosis } from '@/types';

interface SentimentSectionProps {
  diagnosis: AiDiagnosis;
  history: AiDiagnosis[];
}

const TREND_LABELS = {
  improving: '改善傾向',
  stable: '安定',
  declining: '低下傾向',
} as const;

export function SentimentSection({ diagnosis, history }: SentimentSectionProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const score = Number(diagnosis.sentiment_score);
  const positiveRatio = Math.round(Number(diagnosis.sentiment_positive_ratio) * 100);
  const negativeRatio = Math.round(Number(diagnosis.sentiment_negative_ratio) * 100);
  const neutralRatio = Math.round(Number(diagnosis.sentiment_neutral_ratio) * 100);

  // スコアバーの位置計算（-1〜1 → 0%〜100%）
  const barPosition = ((score + 1) / 2) * 100;

  const chartData = history.map((d) => ({
    label: `${d.month}月`,
    score: Number(d.sentiment_score),
  }));

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-text-primary mb-4">
        ネガポジ分析
      </h3>

      {/* 全体スコア */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-text-secondary">全体スコア</span>
          <span className="text-sm font-medium text-text-primary">
            {score > 0 ? '+' : ''}{score.toFixed(2)}
            <span className="ml-2 text-text-secondary">({TREND_LABELS[diagnosis.sentiment_trend]})</span>
          </span>
        </div>
        <div className="relative h-3 bg-background rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${barPosition}%`,
              background: `linear-gradient(to right, #C47C7C, #D4CFC7, #7BA383)`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>ネガティブ</span>
          <span>ポジティブ</span>
        </div>
      </div>

      {/* 比率バー */}
      <div className="mb-4">
        <div className="flex h-4 rounded-full overflow-hidden">
          <div className="bg-success" style={{ width: `${positiveRatio}%` }} />
          <div className="bg-border" style={{ width: `${neutralRatio}%` }} />
          <div className="bg-error" style={{ width: `${negativeRatio}%` }} />
        </div>
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span className="text-success">ポジ {positiveRatio}%</span>
          <span>中立 {neutralRatio}%</span>
          <span className="text-error">ネガ {negativeRatio}%</span>
        </div>
      </div>

      {/* キーワード */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-sm font-medium text-success">ポジティブ</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {diagnosis.sentiment_positive_keywords.map((kw, i) => (
              <span key={i} className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-error">ネガティブ</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {diagnosis.sentiment_negative_keywords.map((kw, i) => (
              <span key={i} className="text-xs bg-error/10 text-error px-2 py-0.5 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 推移グラフ */}
      {mounted && chartData.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">月次推移</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC7" />
              <XAxis dataKey="label" stroke="#6B6B6B" fontSize={12} />
              <YAxis stroke="#6B6B6B" fontSize={12} domain={[-1, 1]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D4CFC7',
                  borderRadius: '8px',
                }}
                formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(2)}`, 'スコア'] : ['', 'スコア']}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#5D7A6E"
                strokeWidth={2}
                dot={{ fill: '#5D7A6E', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
