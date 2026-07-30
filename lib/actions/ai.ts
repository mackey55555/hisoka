'use server';

import { createClient } from '@/lib/supabase/server';
import type { AiDiagnosis, AiQuestionSuggest, UserSkillProfile } from '@/types';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { getTeamPlanConfigById } from '@/lib/plan/team-plan';
import { diagnosisMinMonth } from '@/lib/plan/plans';

/** (year,month) がプランの診断閲覧窓(最古 min)以降か。min=null は無制限。 */
function inDiagnosisWindow(
  year: number,
  month: number,
  min: { year: number; month: number } | null
): boolean {
  return !min || year > min.year || (year === min.year && month >= min.month);
}

/**
 * トレーニー: 自分の「密かなスキル」プロファイル（全期間）を取得
 */
export async function getMySkillProfile(teamSlug: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: '認証が必要です' };

  const { data, error } = await supabase
    .from('user_skill_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_id', team.teamId)
    .maybeSingle();

  if (error) return { data: null, error: 'スキルプロファイルの取得に失敗しました' };
  return { data: data as UserSkillProfile | null, error: null };
}

/**
 * トレーニー: 自分の月次診断を取得
 */
export async function getMyDiagnosis(teamSlug: string, year: number, month: number) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: '認証が必要です' };

  // 閲覧窓外（Free: 当月+前月より古い）は非表示
  const min = diagnosisMinMonth((await getTeamPlanConfigById(team.teamId)).id);
  if (!inDiagnosisWindow(year, month, min)) return { data: null, error: null };

  const { data, error } = await supabase
    .from('ai_diagnoses')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_id', team.teamId)
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
export async function getMyDiagnosisHistory(teamSlug: string, months: number = 6) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: '認証が必要です' };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

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
    .eq('team_id', team.teamId)
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

  if (error) return { data: null, error: '診断履歴の取得に失敗しました' };
  // 閲覧窓外（Free: 当月+前月より古い）を除外
  const min = diagnosisMinMonth((await getTeamPlanConfigById(team.teamId)).id);
  const rows = ((data || []) as AiDiagnosis[]).filter((d) =>
    inDiagnosisWindow(d.year, d.month, min)
  );
  return { data: rows, error: null };
}

/**
 * トレーナー: 担当トレーニーの月次診断を取得
 */
export async function getTraineeDiagnosis(
  teamSlug: string,
  traineeId: string,
  year: number,
  month: number
) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: '認証が必要です' };

  // 閲覧窓外（Free: 当月+前月より古い）は非表示（チームのプラン基準）
  const min = diagnosisMinMonth((await getTeamPlanConfigById(team.teamId)).id);
  if (!inDiagnosisWindow(year, month, min)) return { data: null, error: null };

  const { data, error } = await supabase
    .from('ai_diagnoses')
    .select('*')
    .eq('user_id', traineeId)
    .eq('team_id', team.teamId)
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
export async function getAllTraineesLatestDiagnosis(teamSlug: string) {
  const team = await resolveTeamFromSlug(teamSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: '認証が必要です' };

  const { data: assignments } = await (supabase as any)
    .from('trainer_trainees')
    .select('trainee_id, trainee:users!trainer_trainees_trainee_id_fkey(id, name)')
    .eq('trainer_id', user.id)
    .eq('team_id', team.teamId);

  if (!assignments || assignments.length === 0) {
    return { data: [], error: null };
  }

  const traineeIds = assignments.map((a: any) => a.trainee_id);

  const { data: diagnoses } = await supabase
    .from('ai_diagnoses')
    .select('*')
    .in('user_id', traineeIds)
    .eq('team_id', team.teamId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  // 閲覧窓外（Free: 当月+前月より古い）は「最新」候補から除外
  const min = diagnosisMinMonth((await getTeamPlanConfigById(team.teamId)).id);
  const latestByUser = new Map<string, AiDiagnosis>();
  for (const d of (diagnoses || []) as AiDiagnosis[]) {
    if (!inDiagnosisWindow(d.year, d.month, min)) continue;
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
export async function getQuestionSuggests(teamSlug: string, diagnosisId: string) {
  const team = await resolveTeamFromSlug(teamSlug);

  // プランゲート: 質問サジェストは Starter 以上
  const plan = await getTeamPlanConfigById(team.teamId);
  if (!plan.features.questionSuggest) {
    return { data: null, error: null, locked: true as const };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: '認証が必要です' };

  // diagnosis_id 経由で team_id 検証は RLS に任せる
  const { data, error } = await supabase
    .from('ai_question_suggests')
    .select('*')
    .eq('diagnosis_id', diagnosisId)
    .order('priority', { ascending: true });

  if (error) return { data: null, error: '質問サジェストの取得に失敗しました' };
  return { data: (data || []) as AiQuestionSuggest[], error: null };
}
