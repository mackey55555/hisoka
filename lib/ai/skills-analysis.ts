/**
 * 非認知能力の分析エンジン（T2 / 行動エビデンス抽出＋ルーブリック採点）
 * ------------------------------------------------------------------
 * 課題整理_非認知能力の実装.md §5-2 の設計を実装する。
 *
 *   × 旧: Big Five 50問を著者に代わって代理回答 → HIGH/LOW（妥当性が弱い）
 *   ○ 新: 本人テキストから「観察可能な行動のエビデンス」を抽出し、
 *         skills-taxonomy のルーブリックに照らして段階＋信頼度＋引用を返す。
 *
 * このモジュールは純粋な "分析ロジック" のみを持つ（DB書き込みはしない）。
 * 本番バッチ(analysis.ts)への配線と保存は T3（スキーマ＋UI）で行う。
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from './model';
import {
  NON_COGNITIVE_SKILLS,
  SKILL_BY_ID,
  DOMAIN_BY_ID,
  type SkillEvidence,
} from './skills-taxonomy';

/** 15スキルのIDタプル（zod enum 用） */
const SKILL_IDS = NON_COGNITIVE_SKILLS.map((s) => s.id) as [string, ...string[]];

/**
 * LLMからの生出力スキーマ。
 * 注: Anthropic の構造化出力は integer/number への minimum/maximum を許さないため、
 * level はリテラル和、confidence/quotes の範囲はコード側(normalize)で担保する。
 */
const rawSkillItemSchema = z.object({
  skillId: z.enum(SKILL_IDS),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  confidence: z.number(),
  quotes: z.array(z.string()),
  rationale: z.string(),
});

const skillsOutputSchema = z.object({
  skills: z.array(rawSkillItemSchema),
});

/**
 * taxonomy（SSOT）から、プロンプトに埋め込むスキル定義ブロックを組み立てる。
 * ルーブリックを変更すればプロンプトも自動追従する。
 */
function buildSkillCatalog(): string {
  return NON_COGNITIVE_SKILLS.map((s) => {
    const domain = DOMAIN_BY_ID[s.domainId];
    const levels = s.rubric
      .map((r) => `      - Lv${r.level}（${r.label}）: ${r.descriptor}`)
      .join('\n');
    return [
      `- id: ${s.id}（${s.displayName} / 領域: ${domain?.name ?? s.domainId}）`,
      `    定義: ${s.definition}`,
      `    ルーブリック:`,
      levels,
    ].join('\n');
  }).join('\n');
}

/**
 * 分析プロンプトを組み立てる。
 * {TEXT} は使わず、テキストを本文に差し込む（誤置換を避ける）。
 */
export function buildSkillsPrompt(text: string): string {
  return `あなたは、人材育成のために「非認知能力（社会情動的スキル）」を可視化するアナリストです。
以下は、あるメンバー本人が書いた「目標・活動記録・振り返り」のテキストです。
このテキストの中から、下記15スキルそれぞれについて「実際に発揮された行動の証拠（エビデンス）」を探し、ルーブリックに照らして評価してください。

重要な原則（必ず守る）:
- テキストに実際に書かれている行動だけを根拠にする。書かれていないことを推測で補わない。
- 感情の推定や性格の断定、診断はしない。あくまで「行動の事実」からスキルの発揮を見取る。
- 根拠となる行動が見当たらないスキルは level を null にし、quotes は空配列、confidence は低くする。
- quotes は本人テキストからの短い抜き出し（原文のまま、各スキル最大3件）。創作しない。
- rationale は1〜2文。「〜という行動が見られるため Lv2 と推定」のように、推定であって評価確定ではない前提で書く。
- 15スキルすべてを漏れなく出力する（該当なしでも level:null で必ず含める）。
- level は次の基準:
    - Lv1（芽生え）/ Lv2（発揮）/ Lv3（牽引）… ルーブリックの記述に最も合う段階を選ぶ
    - 根拠が弱い・曖昧なときは無理に上げず、confidence を下げる

スキル定義とルーブリック（全15）:
${buildSkillCatalog()}

--- メンバー本人のテキスト ここから ---
${text}
--- メンバー本人のテキスト ここまで ---

出力: 各スキルについて skillId / level(1-3 または null) / confidence(0-1) / quotes(最大3) / rationale を返す。`;
}

/**
 * LLM出力を「15スキル全件そろった SkillEvidence[]」に正規化する。
 * - 欠落スキルは level=null / confidence=0 で補完
 * - 未知IDは捨てる
 * - taxonomy の並び順にそろえる
 */
function normalizeEvidence(
  raw: z.infer<typeof skillsOutputSchema>,
): SkillEvidence[] {
  const byId = new Map<string, SkillEvidence>();
  for (const item of raw.skills) {
    if (!SKILL_BY_ID[item.skillId]) continue; // 未知IDは無視
    byId.set(item.skillId, {
      skillId: item.skillId,
      level: item.level ?? null,
      // 範囲はスキーマでなくここで担保（Anthropic構造化出力の制約回避）
      confidence: Math.max(0, Math.min(1, item.confidence)),
      quotes: item.quotes.slice(0, 3),
      rationale: item.rationale,
    });
  }

  return NON_COGNITIVE_SKILLS.map(
    (s): SkillEvidence =>
      byId.get(s.id) ?? {
        skillId: s.id,
        level: null,
        confidence: 0,
        quotes: [],
        rationale: '該当する行動の記述が見当たりませんでした。',
      },
  );
}

/**
 * 本人テキストを分析し、15スキルの行動エビデンスを返す。
 * 特性スコアの断定はせず、根拠(quotes)と信頼度(confidence)を必ず添える。
 */
export async function analyzeSkills(text: string): Promise<SkillEvidence[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: skillsOutputSchema,
    prompt: buildSkillsPrompt(text),
  });
  return normalizeEvidence(object);
}

/**
 * 質問サジェスト等で使う、人間可読なスキル要約を作る。
 * 判定できたスキル（level != null）を段階の高い順に並べる。
 */
export function summarizeSkillEvidence(evidence: SkillEvidence[]): string {
  const assessed = evidence
    .filter((e) => e.level !== null)
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0));

  if (assessed.length === 0) {
    return '（今月のテキストからは、明確に見取れる非認知能力の行動はまだ多くありません）';
  }

  return assessed
    .map((e) => {
      const skill = SKILL_BY_ID[e.skillId];
      const label = skill?.rubric.find((r) => r.level === e.level)?.label ?? '';
      return `${skill?.displayName ?? e.skillId}: Lv${e.level}（${label}）`;
    })
    .join(', ');
}
