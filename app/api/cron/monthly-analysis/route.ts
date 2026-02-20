import { runMonthlyAnalysis } from '@/lib/ai/analysis';

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runMonthlyAnalysis();
    return Response.json(result);
  } catch (error) {
    console.error('月次分析バッチエラー:', error);
    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
