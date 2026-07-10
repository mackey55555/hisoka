/**
 * サーバー側でチームの現在プラン設定を取得するヘルパー。
 * RLS スコープの client で teams.plan を読む(所属メンバーのみ読める想定)。
 */
import { createClient } from '@/lib/supabase/server';
import { getPlanConfig, type PlanConfig } from './plans';

export async function getTeamPlanConfigById(teamId: string): Promise<PlanConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('teams' as any)
    .select('plan')
    .eq('id', teamId)
    .maybeSingle();
  return getPlanConfig((data as any)?.plan);
}

/** slug からプラン設定を取得。teams が読めない(非メンバー等)場合は null。 */
export async function getTeamPlanConfigBySlug(slug: string): Promise<PlanConfig | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('teams' as any)
    .select('plan')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  return getPlanConfig((data as any).plan);
}
