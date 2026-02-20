import { createClient } from '@/lib/supabase/server';
import { getTraineeDiagnosis, getQuestionSuggests } from '@/lib/actions/ai';
import { MonthNavigator } from '@/components/features/ai/month-navigator';
import { SummaryCard } from '@/components/features/ai/summary-card';
import { SentimentSection } from '@/components/features/ai/sentiment-section';
import { PersonalitySection } from '@/components/features/ai/personality-section';
import { QuestionSuggests } from '@/components/features/ai/question-suggests';
import { Card } from '@/components/ui/card';
import type { AiDiagnosis } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function TrainerAiDetailPage({ params, searchParams }: PageProps) {
  const { id: traineeId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // トレーニー名を取得
  const { data: traineeData } = await supabase
    .from('users')
    .select('name')
    .eq('id', traineeId)
    .single();

  const traineeName = (traineeData as any)?.name || 'トレーニー';

  const now = new Date();
  const year = sp.year ? parseInt(sp.year) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1;

  const { data: diagnosis } = await getTraineeDiagnosis(traineeId, year, month);

  // 推移データを取得（直近6ヶ月分）
  const historyPromises = Array.from({ length: 6 }, (_, i) => {
    let m = month - i;
    let y = year;
    while (m <= 0) { m += 12; y -= 1; }
    return getTraineeDiagnosis(traineeId, y, m);
  });
  const historyResults = await Promise.all(historyPromises);
  const history = historyResults
    .map((r) => r.data)
    .filter((d): d is AiDiagnosis => d !== null)
    .reverse();

  // 質問サジェスト取得
  let questions: any[] = [];
  if (diagnosis) {
    const { data } = await getQuestionSuggests(diagnosis.id);
    questions = data || [];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-text-primary mb-4 mt-4">
        {traineeName}さんのAI診断
      </h1>

      <MonthNavigator
        year={year}
        month={month}
        basePath={`/trainer/trainees/${traineeId}/ai`}
      />

      {diagnosis ? (
        <>
          <SummaryCard summary={diagnosis.summary} />
          <SentimentSection diagnosis={diagnosis} history={history} />
          <PersonalitySection diagnosis={diagnosis} />
          <QuestionSuggests questions={questions} />
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
