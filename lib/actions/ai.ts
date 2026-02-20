'use server';

import { createClient } from '@/lib/supabase/server';
import type { AiDiagnosis, AiQuestionSuggest } from '@/types';

/**
 * トレーニー: 自分の月次診断を取得
 */
export async function getMyDiagnosis(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const { data, error } = await supabase
    .from('ai_diagnoses')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: '診断データの取得に失敗しました' };
  }

  return { data: data as AiDiagnosis | null, error: null };
}

/**
 * トレーニー: 推移グラフ用に直近Nヶ月の診断を取得
 */
export async function getMyDiagnosisHistory(months: number = 6) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Nヶ月前の年月を計算
  let startYear = currentYear;
  let startMonth = currentMonth - months + 1;
  if (startMonth <= 0) {
    startYear -= Math.ceil(Math.abs(startMonth) / 12);
    startMonth = 12 + (startMonth % 12) || 12;
  }

  const { data, error } = await supabase
    .from('ai_diagnoses')
    .select('*')
    .eq('user_id', user.id)
    .or(
      Array.from({ length: months }, (_, i) => {
        let m = startMonth + i;
        let y = startYear;
        if (m > 12) { m -= 12; y += 1; }
        return `and(year.eq.${y},month.eq.${m})`;
      }).join(',')
    )
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (error) {
    return { data: null, error: '診断履歴の取得に失敗しました' };
  }

  return { data: (data || []) as AiDiagnosis[], error: null };
}

/**
 * トレーナー: 担当トレーニーの月次診断を取得
 */
export async function getTraineeDiagnosis(traineeId: string, year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const { data, error } = await supabase
    .from('ai_diagnoses')
    .select('*')
    .eq('user_id', traineeId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: '診断データの取得に失敗しました' };
  }

  return { data: data as AiDiagnosis | null, error: null };
}

/**
 * トレーナー: 担当全トレーニーの最新診断（サマリーカード用）
 */
export async function getAllTraineesLatestDiagnosis() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  // 担当トレーニーを取得
  const { data: assignments } = await (supabase as any)
    .from('trainer_trainees')
    .select('trainee_id, trainee:users!trainer_trainees_trainee_id_fkey(id, name)')
    .eq('trainer_id', user.id);

  if (!assignments || assignments.length === 0) {
    return { data: [], error: null };
  }

  const traineeIds = assignments.map((a: any) => a.trainee_id);

  // 各トレーニーの最新診断を取得
  const { data: diagnoses } = await supabase
    .from('ai_diagnoses')
    .select('*')
    .in('user_id', traineeIds)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  // トレーニーごとに最新の1件のみ残す
  const latestByUser = new Map<string, AiDiagnosis>();
  for (const d of (diagnoses || []) as AiDiagnosis[]) {
    if (!latestByUser.has(d.user_id)) {
      latestByUser.set(d.user_id, d);
    }
  }

  const result = assignments.map((a: any) => ({
    trainee: a.trainee as any as { id: string; name: string },
    diagnosis: latestByUser.get(a.trainee_id) || null,
  }));

  return { data: result, error: null };
}

/**
 * トレーナー: 質問サジェスト取得
 */
export async function getQuestionSuggests(diagnosisId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '認証が必要です' };
  }

  const { data, error } = await supabase
    .from('ai_question_suggests')
    .select('*')
    .eq('diagnosis_id', diagnosisId)
    .order('priority', { ascending: true });

  if (error) {
    return { data: null, error: '質問サジェストの取得に失敗しました' };
  }

  return { data: (data || []) as AiQuestionSuggest[], error: null };
}
