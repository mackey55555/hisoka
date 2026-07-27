'use client';

import { Card } from '@/components/ui/card';
import type { AiDiagnosis } from '@/types';
import {
  SKILL_DOMAINS,
  SKILL_BY_ID,
  skillsInDomain,
  type SkillEvidence,
} from '@/lib/ai/skills-taxonomy';

interface SkillEvidenceSectionProps {
  diagnosis: AiDiagnosis;
  /** 見出し（既定: マネージャー/月次向け）。本人向けは「あなたの密かなスキル」等 */
  title?: string;
  /** 見出し下の説明文 */
  intro?: string;
}

/** 段階ラベルと配色 */
const LEVEL_STYLE: Record<1 | 2 | 3, { label: string; cls: string }> = {
  1: { label: '芽生え', cls: 'bg-background text-text-secondary border border-[#D4CFC7]' },
  2: { label: '発揮', cls: 'bg-primary/10 text-primary' },
  3: { label: '牽引', cls: 'bg-success/15 text-success' },
};

/**
 * 非認知能力の「見える化」セクション。
 * 特性スコアの断定ではなく、行動エビデンス（引用）＋段階＋信頼度で示す。
 */
export function SkillEvidenceSection({
  diagnosis,
  title = '見える化された非認知能力',
  intro = '本人のテキストから読み取れた「行動の事実」をもとに、発揮された力を見える化しています。',
}: SkillEvidenceSectionProps) {
  const evidence = diagnosis.skill_evidence;

  // 旧データ（skill_evidence 無し）へのフォールバック
  if (!evidence || evidence.length === 0) {
    return (
      <Card className="mb-6">
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-base text-text-secondary">
          まだ分析データがありません。
        </p>
      </Card>
    );
  }

  const byId = new Map(evidence.map((e) => [e.skillId, e]));
  const assessedCount = evidence.filter((e) => e.level !== null).length;

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary mb-4">{intro}</p>

      {assessedCount === 0 && (
        <p className="text-base text-text-secondary mb-4">
          今月のテキストからは、まだ明確に見取れる行動が多くありませんでした。
        </p>
      )}

      <div className="space-y-5">
        {SKILL_DOMAINS.map((domain) => {
          const skills = skillsInDomain(domain.id);
          // この領域で判定できたスキル（level != null）だけを根拠つきで表示
          const assessed = skills
            .map((s) => byId.get(s.id))
            .filter((e): e is SkillEvidence => !!e && e.level !== null);

          if (assessed.length === 0) return null;

          return (
            <div key={domain.id}>
              <h4 className="text-base font-bold text-text-primary mb-2 pb-1 border-b border-[#EEE9E1]">
                {domain.name}
              </h4>
              <div className="space-y-3">
                {assessed.map((e) => {
                  const skill = SKILL_BY_ID[e.skillId];
                  const level = e.level as 1 | 2 | 3;
                  const style = LEVEL_STYLE[level];
                  const lowConfidence = e.confidence < 0.4;

                  return (
                    <div
                      key={e.skillId}
                      className="p-3 rounded-lg bg-background"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base font-medium text-text-primary">
                          {skill?.displayName ?? e.skillId}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${style.cls}`}>
                            {style.label}
                          </span>
                          {lowConfidence && (
                            <span className="text-xs text-text-secondary">根拠は控えめ</span>
                          )}
                        </div>
                      </div>

                      {e.rationale && (
                        <p className="text-sm text-text-secondary mb-2">{e.rationale}</p>
                      )}

                      {/* 根拠となった本人テキストの引用 */}
                      {e.quotes.length > 0 && (
                        <ul className="space-y-1">
                          {e.quotes.map((q, i) => (
                            <li
                              key={i}
                              className="text-sm text-text-primary pl-2 border-l-2 border-primary/40"
                            >
                              「{q}」
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 注意書き（推定であり評価確定ではない前提を明示） */}
      <p className="text-sm text-text-secondary mt-4 p-3 bg-background rounded-lg">
        これはAIがテキストから推定した「見取り」であり、評価を確定するものではありません。
        本人・上司の対話のきっかけとしてお使いください。
      </p>
    </Card>
  );
}
