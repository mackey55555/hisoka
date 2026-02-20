import { streamText } from 'ai';
import { getModel } from '@/lib/ai/model';
import { REFLECTION_SUPPORT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  // 認証チェック
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, goalContent, activityContent, reflectionDraft } = await request.json();

  // ターン数チェック（最大3ターン）
  const userMessages = messages.filter((m: any) => m.role === 'user');
  if (userMessages.length > 3) {
    return Response.json({ error: '対話は3ターンまでです' }, { status: 400 });
  }

  const systemPrompt = REFLECTION_SUPPORT_SYSTEM_PROMPT
    .replace('{GOAL_CONTENT}', goalContent || '')
    .replace('{ACTIVITY_CONTENT}', activityContent || '')
    .replace('{REFLECTION_DRAFT}', reflectionDraft || '');

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
