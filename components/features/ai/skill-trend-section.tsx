import { Card } from '@/components/ui/card';
import type { AiDiagnosis } from '@/types';
import {
  SKILL_DOMAINS,
  SKILL_BY_ID,
  skillsInDomain,
} from '@/lib/ai/skills-taxonomy';

interface SkillTrendSectionProps {
  /** 古い→新しい 順の月次診断履歴 */
  history: AiDiagnosis[];
}

type Level = 1 | 2 | 3 | null;

const LEVEL_CELL: Record<1 | 2 | 3, string> = {
  1: 'bg-background text-text-secondary border border-[#D4CFC7]',
  2: 'bg-primary/10 text-primary',
  3: 'bg-success/15 text-success',
};
const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: '芽', 2: '発', 3: '牽' };

function levelOf(d: AiDiagnosis, skillId: string): Level {
  const e = d.skill_evidence?.find((x) => x.skillId === skillId);
  return (e?.level ?? null) as Level;
}

/** そのスキルが履歴中で一度でも判定されたか */
function everAssessed(history: AiDiagnosis[], skillId: string): boolean {
  return history.some((d) => levelOf(d, skillId) !== null);
}

/** 見極めサマリー: 強み・伸びを算出する */
function computeInsights(history: AiDiagnosis[]) {
  const latest = history[history.length - 1];
  const strengths: { skillId: string; level: 2 | 3; confidence: number }[] = [];
  const growing: { skillId: string; from: number; to: number }[] = [];

  for (const skill of Object.values(SKILL_BY_ID)) {
    // 強み: 最新月で Lv2 以上
    const latestEv = latest?.skill_evidence?.find((x) => x.skillId === skill.id);
    if (latestEv && latestEv.level && latestEv.level >= 2) {
      strengths.push({
        skillId: skill.id,
        level: latestEv.level as 2 | 3,
        confidence: latestEv.confidence,
      });
    }
    // 伸び: 最初の非null level < 最後の非null level
    let first: number | null = null;
    let last: number | null = null;
    for (const d of history) {
      const lv = levelOf(d, skill.id);
      if (lv !== null) {
        if (first === null) first = lv;
        last = lv;
      }
    }
    if (first !== null && last !== null && last > first) {
      growing.push({ skillId: skill.id, from: first, to: last });
    }
  }

  strengths.sort((a, b) => b.level - a.level || b.confidence - a.confidence);
  return { strengths: strengths.slice(0, 6), growing };
}

/**
 * マネージャー"見極め"ビュー: メンバーの非認知能力の「時系列の推移」と
 * 「強み・伸び」を俯瞰する。単月の見取り(SkillEvidenceSection)を補完する。
 */
export function SkillTrendSection({ history }: SkillTrendSectionProps) {
  const withData = history.filter(
    (d) => d.skill_evidence && d.skill_evidence.length > 0,
  );

  if (withData.length === 0) {
    return null; // 履歴に skill_evidence が無ければ何も出さない（単月ビューに任せる）
  }

  const { strengths, growing } = computeInsights(withData);

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-text-primary mb-1">見極め：非認知能力の推移</h3>
      <p className="text-xs text-text-secondary mb-4">
        直近{withData.length}か月の行動から見取れた力の変化です。育成・面談の材料としてお使いください（評価の確定ではありません）。
      </p>

      {/* 見極めサマリー */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-lg bg-background">
          <h4 className="text-sm font-bold text-text-primary mb-2">強み（今月）</h4>
          {strengths.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {strengths.map((s) => (
                <span
                  key={s.skillId}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                >
                  {SKILL_BY_ID[s.skillId]?.displayName ?? s.skillId}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-secondary">今月はまだ明確な強みが見取れていません</p>
          )}
        </div>

        <div className="p-3 rounded-lg bg-background">
          <h4 className="text-sm font-bold text-text-primary mb-2">伸びている力</h4>
          {growing.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {growing.map((g) => (
                <span
                  key={g.skillId}
                  className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-medium"
                >
                  {SKILL_BY_ID[g.skillId]?.displayName ?? g.skillId} ↗
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-secondary">複数月のデータが増えると変化が見えてきます</p>
          )}
        </div>
      </div>

      {/* 推移テーブル（領域ごと） */}
      <div className="space-y-4">
        {SKILL_DOMAINS.map((domain) => {
          const skills = skillsInDomain(domain.id).filter((s) =>
            everAssessed(withData, s.id),
          );
          if (skills.length === 0) return null;

          return (
            <div key={domain.id}>
              <h4 className="text-sm font-bold text-text-primary mb-2 pb-1 border-b border-[#EEE9E1]">
                {domain.name}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-secondary">
                      <th className="text-left font-normal pb-1 pr-2">スキル</th>
                      {withData.map((d) => (
                        <th key={`${d.year}-${d.month}`} className="font-normal pb-1 px-1 text-center whitespace-nowrap">
                          {d.month}月
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((skill) => (
                      <tr key={skill.id}>
                        <td className="py-1 pr-2 text-text-primary whitespace-nowrap">
                          {skill.displayName}
                        </td>
                        {withData.map((d) => {
                          const lv = levelOf(d, skill.id);
                          return (
                            <td key={`${d.year}-${d.month}`} className="py-1 px-1 text-center">
                              {lv ? (
                                <span
                                  className={`inline-block w-6 py-0.5 rounded font-medium ${LEVEL_CELL[lv]}`}
                                  title={`Lv${lv}`}
                                >
                                  {LEVEL_LABEL[lv]}
                                </span>
                              ) : (
                                <span className="text-text-secondary/40">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-text-secondary mt-3">凡例: 芽=芽生え / 発=発揮 / 牽=牽引 ・「·」はその月に見取れなかったことを表します</p>
    </Card>
  );
}
