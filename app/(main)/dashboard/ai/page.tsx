import { createClient } from '@/lib/supabase/server';
import { getMyDiagnosis, getMyDiagnosisHistory } from '@/lib/actions/ai';
import { MonthNavigator } from '@/components/features/ai/month-navigator';
import { SummaryCard } from '@/components/features/ai/summary-card';
import { SentimentSection } from '@/components/features/ai/sentiment-section';
import { PersonalitySection } from '@/components/features/ai/personality-section';
import { Card } from '@/components/ui/card';

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function AiDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const [{ data: diagnosis }, { data: history }] = await Promise.all([
    getMyDiagnosis(year, month),
    getMyDiagnosisHistory(6),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <MonthNavigator year={year} month={month} basePath="/dashboard/ai" />

      {diagnosis ? (
        <>
          <SummaryCard summary={diagnosis.summary} />
          <SentimentSection diagnosis={diagnosis} history={history || []} />
          <PersonalitySection diagnosis={diagnosis} />
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
