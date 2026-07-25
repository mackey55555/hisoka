'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import type { AiDiagnosis } from '@/types';
import { SKILL_BY_ID, type SkillEvidence } from '@/lib/ai/skills-taxonomy';
import { useCurrentTeam } from '@/lib/context/current-team-client';

interface TraineeAiCardProps {
  trainee: { id: string; name: string };
  diagnosis: AiDiagnosis | null;
}

const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: '芽生え', 2: '発揮', 3: '牽引' };

/** 判定できたスキルを段階の高い順に最大3件返す */
function topSkills(evidence: SkillEvidence[] | null): SkillEvidence[] {
  if (!evidence) return [];
  return evidence
    .filter((e) => e.level !== null)
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || b.confidence - a.confidence)
    .slice(0, 3);
}

export function TraineeAiCard({ trainee, diagnosis }: TraineeAiCardProps) {
  const { slug } = useCurrentTeam();

  if (!diagnosis) {
    return (
      <Link href={`/t/${slug}/trainer/trainees/${trainee.id}`}>
        <Card className="hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-text-primary mb-2">{trainee.name}</h3>
          <p className="text-sm text-text-secondary">AI診断はまだありません</p>
        </Card>
      </Link>
    );
  }

  const skills = topSkills(diagnosis.skill_evidence);
  const score = Number(diagnosis.sentiment_score);
  const summaryPreview = diagnosis.summary.length > 60
    ? diagnosis.summary.slice(0, 60) + '...'
    : diagnosis.summary;

  return (
    <Link href={`/t/${slug}/trainer/trainees/${trainee.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <h3 className="text-lg font-medium text-text-primary mb-2">{trainee.name}</h3>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-text-secondary">ネガポジ:</span>
          <span className={`text-sm font-medium ${score >= 0 ? 'text-success' : 'text-error'}`}>
            {score > 0 ? '+' : ''}{score.toFixed(2)}
          </span>
        </div>

        {/* 見える化された非認知能力（上位） */}
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {skills.map((e) => (
              <span
                key={e.skillId}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                {SKILL_BY_ID[e.skillId]?.displayName ?? e.skillId}
                <span className="text-text-secondary ml-1">
                  {LEVEL_LABEL[(e.level ?? 1) as 1 | 2 | 3]}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary mb-2">
            まだ見取れる行動が多くありません
          </p>
        )}

        <p className="text-sm text-text-secondary mt-1">{summaryPreview}</p>

        <span onClick={(e) => e.stopPropagation()} className="inline-block mt-2">
          <Link
            href={`/t/${slug}/trainer/trainees/${trainee.id}/ai`}
            className="text-xs text-primary font-medium hover:underline"
          >
            AI詳細を見る →
          </Link>
        </span>
      </Card>
    </Link>
  );
}
