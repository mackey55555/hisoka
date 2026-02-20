import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getModel } from './model';
import { PERSONALITY_PROMPT, SENTIMENT_PROMPT, SUMMARY_PROMPT, QUESTION_SUGGEST_PROMPT } from './prompts';
import { parsePersonalityResponse, calcAllTraitScores } from './personality-parser';
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

const sentimentSchema = z.object({
  score: z.number().min(-1).max(1),
  positive_ratio: z.number().min(0).max(1),
  negative_ratio: z.number().min(0).max(1),
  neutral_ratio: z.number().min(0).max(1),
  positive_keywords: z.array(z.string()).max(5),
  negative_keywords: z.array(z.string()).max(5),
});

const questionSuggestSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    category: z.enum(['growth', 'challenge', 'strength', 'emotion', 'next_step']),
    intent: z.string(),
    priority: z.number().int().min(1).max(5),
  })).length(5),
});

/**
 * トレーニーの当月テキストを収集する
 */
async function collectText(
  adminClient: ReturnType<typeof getAdminClient>,
  traineeId: string,
  monthStart: string,
  nextMonthStart: string,
): Promise<string> {
  const { data } = await adminClient
    .from('goals')
    .select(`
      content,
      activities (
        content,
        reflections ( content )
      )
    `)
    .eq('user_id', traineeId)
    .gte('created_at', monthStart)
    .lt('created_at', nextMonthStart);

  if (!data) return '';

  const texts: string[] = [];
  for (const goal of data as any[]) {
    texts.push(goal.content);
    if (goal.activities) {
      for (const activity of goal.activities) {
        texts.push(activity.content);
        if (activity.reflections) {
          for (const reflection of activity.reflections) {
            texts.push(reflection.content);
          }
        }
      }
    }
  }

  return texts.filter(Boolean).join('\n');
}

/**
 * ネガポジ分析
 */
async function analyzeSentiment(text: string) {
  const prompt = SENTIMENT_PROMPT.replace('{TEXT}', text);
  const { object } = await generateObject({
    model: getModel(),
    schema: sentimentSchema,
    prompt,
  });
  return object;
}

/**
 * パーソナリティ特性分析
 */
async function analyzePersonality(text: string) {
  const prompt = PERSONALITY_PROMPT.replace('{TEXT}', text);
  const { text: responseText } = await generateText({
    model: getModel(),
    prompt,
  });
  const parsed = parsePersonalityResponse(responseText);
  const traits = calcAllTraitScores(parsed.scores, parsed.traits);
  return { rawScores: parsed.scores, traits };
}

/**
 * 月次要約
 */
async function generateSummary(text: string) {
  const prompt = SUMMARY_PROMPT.replace('{TEXT}', text);
  const { text: summary } = await generateText({
    model: getModel(),
    prompt,
  });
  return summary;
}

/**
 * トレンド算出（前月比較）
 */
function calcTrend(
  currentScore: number,
  prevScore: number | null,
): 'improving' | 'stable' | 'declining' {
  if (prevScore === null) return 'stable';
  const diff = currentScore - prevScore;
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}

/**
 * 質問サジェスト生成
 */
async function generateQuestions(
  sentimentScore: number,
  positiveKeywords: string[],
  negativeKeywords: string[],
  traits: Record<string, { score: number; level: string }>,
  summary: string,
) {
  const traitsSummary = Object.entries(traits)
    .map(([k, v]) => `${k}: ${v.score} (${v.level})`)
    .join(', ');

  const prompt = QUESTION_SUGGEST_PROMPT
    .replace('{SENTIMENT_SCORE}', sentimentScore.toString())
    .replace('{POSITIVE_KEYWORDS}', positiveKeywords.join(', '))
    .replace('{NEGATIVE_KEYWORDS}', negativeKeywords.join(', '))
    .replace('{TRAITS_SUMMARY}', traitsSummary)
    .replace('{SUMMARY}', summary);

  const { object } = await generateObject({
    model: getModel(),
    schema: questionSuggestSchema,
    prompt,
  });
  return object.questions;
}

export interface AnalysisResult {
  processed: number;
  skipped: number;
  failed: number;
  partial: boolean;
}

/**
 * 月次分析バッチのメイン処理
 */
export async function runMonthlyAnalysis(): Promise<AnalysisResult> {
  const adminClient = getAdminClient();
  const startTime = Date.now();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;

  // 今週の開始（月曜日）を計算
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  // 全トレーニーを取得
  const { data: trainees } = await (adminClient as any)
    .from('users')
    .select('id, roles!inner(name)')
    .eq('roles.name', 'trainee');

  if (!trainees || trainees.length === 0) {
    return { processed: 0, skipped: 0, failed: 0, partial: false };
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const trainee of trainees) {
    // 残り時間チェック（30秒を切ったら中断）
    if (Date.now() - startTime > 270_000) {
      return {
        processed,
        skipped,
        failed,
        partial: true,
      };
    }

    try {
      // 今週すでに分析済みならスキップ
      const { data: existing } = await adminClient
        .from('ai_diagnoses')
        .select('analyzed_at')
        .eq('user_id', trainee.id)
        .eq('year', year)
        .eq('month', month)
        .single();

      if (existing?.analyzed_at && new Date(existing.analyzed_at) >= weekStart) {
        skipped++;
        continue;
      }

      // テキスト収集
      const text = await collectText(adminClient, trainee.id, monthStart, nextMonthStart);

      if (text.length < MIN_TEXT_LENGTH) {
        skipped++;
        continue;
      }

      // 3分析を並列実行
      const [sentiment, personality, summary] = await Promise.all([
        analyzeSentiment(text),
        analyzePersonality(text),
        generateSummary(text),
      ]);

      // 前月データを取得してトレンド算出
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const { data: prevDiagnosis } = await adminClient
        .from('ai_diagnoses')
        .select('sentiment_score')
        .eq('user_id', trainee.id)
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .single();

      const trend = calcTrend(
        sentiment.score,
        prevDiagnosis ? Number(prevDiagnosis.sentiment_score) : null,
      );

      // ai_diagnoses に UPSERT
      const { data: diagnosis, error: upsertError } = await adminClient
        .from('ai_diagnoses')
        .upsert({
          user_id: trainee.id,
          year,
          month,
          sentiment_score: sentiment.score,
          sentiment_positive_ratio: sentiment.positive_ratio,
          sentiment_negative_ratio: sentiment.negative_ratio,
          sentiment_neutral_ratio: sentiment.neutral_ratio,
          sentiment_positive_keywords: sentiment.positive_keywords,
          sentiment_negative_keywords: sentiment.negative_keywords,
          sentiment_trend: trend,
          personality_raw_scores: personality.rawScores,
          personality_traits: personality.traits,
          summary,
          source_text_length: text.length,
          analyzed_at: new Date().toISOString(),
        } as any, {
          onConflict: 'user_id,year,month',
        })
        .select('id')
        .single();

      if (upsertError || !diagnosis) {
        console.error(`UPSERT失敗 (user: ${trainee.id}):`, upsertError);
        failed++;
        continue;
      }

      // 質問サジェスト生成
      const questions = await generateQuestions(
        sentiment.score,
        sentiment.positive_keywords,
        sentiment.negative_keywords,
        personality.traits,
        summary,
      );

      // 既存の質問を削除して新規INSERT
      await adminClient
        .from('ai_question_suggests')
        .delete()
        .eq('diagnosis_id', diagnosis.id);

      await adminClient
        .from('ai_question_suggests')
        .insert(
          questions.map((q) => ({
            diagnosis_id: diagnosis.id,
            question: q.question,
            category: q.category,
            intent: q.intent,
            priority: q.priority,
          }))
        );

      processed++;
    } catch (error) {
      console.error(`分析失敗 (user: ${trainee.id}):`, error);
      failed++;
    }
  }

  return { processed, skipped, failed, partial: false };
}
