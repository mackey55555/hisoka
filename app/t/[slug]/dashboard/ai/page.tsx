import { createClient } from '@/lib/supabase/server';
import { getMyDiagnosis, getMyDiagnosisHistory } from '@/lib/actions/ai';
import { getTeamPlanConfigBySlug } from '@/lib/plan/team-plan';
import { diagnosisMinMonth } from '@/lib/plan/plans';
import { MonthNavigator } from '@/components/features/ai/month-navigator';
import { SummaryCard } from '@/components/features/ai/summary-card';
import { SentimentSection } from '@/components/features/ai/sentiment-section-lazy';
import { SkillEvidenceSection } from '@/components/features/ai/skill-evidence-section';
import { HistoryLimitNotice } from '@/components/features/plan/history-limit-notice';
import { Card } from '@/components/ui/card';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function AiDashboardPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const now = new Date();
  const year = sp.year ? parseInt(sp.year) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1;

  const [{ data: diagnosis }, { data: history }, plan] = await Promise.all([
    getMyDiagnosis(slug, year, month),
    getMyDiagnosisHistory(slug, 6),
    getTeamPlanConfigBySlug(slug),
  ]);

  const min = diagnosisMinMonth(plan?.id);
  // 表示中の月が窓外（Free で前月より古い）か
  const outOfWindow = !!min && (year < min.year || (year === min.year && month < min.month));

  return (
    <div className="container mx-auto px-4 py-8">
      <MonthNavigator
        year={year}
        month={month}
        basePath={`/t/${slug}/dashboard/ai`}
        minYear={min?.year}
        minMonth={min?.month}
      />

      {outOfWindow ? (
        <HistoryLimitNotice teamSlug={slug} kind="diagnosis" />
      ) : diagnosis ? (
        <>
          <SummaryCard summary={diagnosis.summary} />
          <SentimentSection diagnosis={diagnosis} history={history || []} />
          <SkillEvidenceSection diagnosis={diagnosis} />
        </>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-12">
            {year}年{month}月のAI診断はまだありません
          </p>
        </Card>
      )}
    </div>
  );
}
