import { createClient } from '@/lib/supabase/server';
import { getMyDiagnosis, getMyDiagnosisHistory } from '@/lib/actions/ai';
import { MonthNavigator } from '@/components/features/ai/month-navigator';
import { SummaryCard } from '@/components/features/ai/summary-card';
import { SentimentSection } from '@/components/features/ai/sentiment-section-lazy';
import { PersonalitySection } from '@/components/features/ai/personality-section-lazy';
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

  const [{ data: diagnosis }, { data: history }] = await Promise.all([
    getMyDiagnosis(slug, year, month),
    getMyDiagnosisHistory(slug, 6),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <MonthNavigator year={year} month={month} basePath={`/t/${slug}/dashboard/ai`} />

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
