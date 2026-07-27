/**
 * あなたの密かなスキル（全期間プロファイル）
 * ------------------------------------------------------------------
 * 月次診断(analysis.ts)と違い、本人の「全期間」の目標・活動・振り返りを
 * まとめて analyzeSkills にかけ、user_skill_profiles に1本キャッシュする。
 * ボタンで都度生成する想定（API route から呼ぶ）。
 */
import { createClient } from '@supabase/supabase-js';
import { analyzeSkills } from './skills-analysis';
import { MIN_TEXT_LENGTH } from './constants';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is required');
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// プロンプトが過大にならないよう、新しい順に集めてこの文字数で打ち切る
const MAX_TEXT_CHARS = 24000;

/**
 * 本人の全期間テキストを新しい順に収集する（上限あり）。
 */
async function collectAllText(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
): Promise<string> {
  const { data } = await admin
    .from('activities')
    .select(`
      content,
      created_at,
      reflections ( content ),
      goals!inner ( id, content, user_id )
    `)
    .eq('goals.user_id', userId)
    .order('created_at', { ascending: false });

  if (!data) return '';

  const texts: string[] = [];
  const seenGoalIds = new Set<string>();
  let total = 0;

  for (const activity of data as any[]) {
    const parts: string[] = [];
    const goal = activity.goals;
    if (goal && !seenGoalIds.has(goal.id)) {
      seenGoalIds.add(goal.id);
      parts.push(goal.content);
    }
    parts.push(activity.content);
    if (activity.reflections) {
      for (const r of activity.reflections) parts.push(r.content);
    }
    for (const p of parts) {
      if (!p) continue;
      texts.push(p);
      total += p.length;
    }
    if (total >= MAX_TEXT_CHARS) break;
  }

  return texts.filter(Boolean).join('\n');
}

export type GenerateProfileResult =
  | { ok: true; profile: any }
  | { ok: false; reason: 'insufficient_text' };

/**
 * 全期間テキストを分析し、user_skill_profiles に upsert する。
 * 書き込みは service key（admin）で行う。userId は呼び出し側で認証済みの本人を渡すこと。
 */
export async function generateAndStoreSkillProfile(
  userId: string,
  teamId: string,
): Promise<GenerateProfileResult> {
  const admin = getAdminClient();
  const text = await collectAllText(admin, userId);

  if (text.length < MIN_TEXT_LENGTH) {
    return { ok: false, reason: 'insufficient_text' };
  }

  const skillEvidence = await analyzeSkills(text);

  const { data, error } = await admin
    .from('user_skill_profiles')
    .upsert(
      {
        user_id: userId,
        team_id: teamId,
        skill_evidence: skillEvidence,
        source_text_length: text.length,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id,team_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return { ok: true, profile: data };
}
