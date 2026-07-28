import Link from 'next/link';
import { Card } from '@/components/ui/card';
import type { UserSkillProfile } from '@/types';
import { SKILL_BY_ID, type SkillEvidence } from '@/lib/ai/skills-taxonomy';

interface MySkillSummaryCardProps {
  teamSlug: string;
  profile: UserSkillProfile | null;
}

const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: '芽生え', 2: '発揮', 3: '牽引' };

/** 判定できたスキルを段階の高い順に最大 n 件 */
function topSkills(evidence: SkillEvidence[] | null | undefined, n = 5): SkillEvidence[] {
  if (!evidence) return [];
  return evidence
    .filter((e) => e.level !== null)
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || b.confidence - a.confidence)
    .slice(0, n);
}

/**
 * ダッシュボード用の「密かなスキル」概略カード。
 * 詳細は専用ページ(/t/[slug]/skills)へ誘導する。
 */
export function MySkillSummaryCard({ teamSlug, profile }: MySkillSummaryCardProps) {
  const href = `/t/${teamSlug}/skills`;
  const skills = topSkills(profile?.skill_evidence);

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-1 gap-3">
        <h3 className="text-lg font-bold text-text-primary">あなたの密かなスキル</h3>
        <Link
          href={href}
          className="text-sm text-primary font-medium hover:underline whitespace-nowrap"
        >
          すべて見る →
        </Link>
      </div>

      {skills.length > 0 ? (
        <>
          <p className="text-sm text-text-secondary mb-3">
            これまでの記録から見えてきた、あなたの“密かな”力（上位）です。
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.map((e) => (
              <span
                key={e.skillId}
                className="text-sm px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium"
              >
                {SKILL_BY_ID[e.skillId]?.displayName ?? e.skillId}
                <span className="text-text-secondary ml-1">
                  {LEVEL_LABEL[(e.level ?? 1) as 1 | 2 | 3]}
                </span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-base text-text-secondary">
          これまで書いてきた目標・活動・振り返りから、数字に表れない“密かな”力をAIが見つけます。
          <Link href={href} className="text-primary font-medium hover:underline ml-1">
            密かなスキルを見つける →
          </Link>
        </p>
      )}
    </Card>
  );
}
