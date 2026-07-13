import { streamText } from 'ai';
import { getModel } from '@/lib/ai/model';
import { REFLECTION_SUPPORT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';
import { getTeamPlanConfigBySlug } from '@/lib/plan/team-plan';

export const maxDuration = 60;

export async function POST(request: Request) {
  // 認証チェック
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, goalContent, activityContent, reflectionDraft, teamSlug } =
    await request.json();

  // プランゲート: AI振り返りサポート(対話)は Starter 以上
  if (!teamSlug) {
    return Response.json({ error: 'チーム情報がありません' }, { status: 400 });
  }
  const plan = await getTeamPlanConfigBySlug(teamSlug);
  if (!plan) {
    return Response.json({ error: 'チームが見つかりません' }, { status: 404 });
  }
  if (!plan.features.reflectionSupport) {
    return Response.json(
      { error: 'AI振り返りサポートは Starter プラン以上でご利用いただけます' },
      { status: 403 }
    );
  }

  // ターン数チェック（最大3ターン）
  const userMessages = messages.filter((m: any) => m.role === 'user');
  if (userMessages.length > 3) {
    return Response.json({ error: '対話は3ターンまでです' }, { status: 400 });
  }

  const systemPrompt = REFLECTION_SUPPORT_SYSTEM_PROMPT
    .replace('{GOAL_CONTENT}', goalContent || '')
    .replace('{ACTIVITY_CONTENT}', activityContent || '')
    .replace('{REFLECTION_DRAFT}', reflectionDraft || '');

  // 初回リクエスト（messages空）の場合、AIに最初の問いかけを生成させる
  const chatMessages = messages.length === 0
    ? [{ role: 'user' as const, content: '振り返りを始めたいです。問いかけをお願いします。' }]
    : messages;

  // 最終ターン（3回目のユーザー発言後）はまとめを生成
  const isFinalTurn = userMessages.length === 3;
  const finalSystemPrompt = isFinalTurn
    ? `あなたは振り返り文の作成アシスタントです。
これまでの対話でトレーニーが語った内容を、振り返りの文章としてまとめてください。

絶対ルール:
- 質問は絶対にしないこと
- トレーニー本人の視点（「〜しました」「〜と感じました」）で書くこと
- 対話の中でトレーニーが語った言葉や気づきをそのまま活かすこと
- 3〜5文程度でまとめること
- コーチングや励ましは不要。事実と気づきだけをまとめること`
    : systemPrompt;

  const result = streamText({
    model: getModel(),
    system: finalSystemPrompt,
    messages: chatMessages,
  });

  return result.toTextStreamResponse();
}
