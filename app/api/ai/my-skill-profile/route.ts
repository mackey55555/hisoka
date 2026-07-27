import { createClient } from '@/lib/supabase/server';
import { resolveTeamFromSlug } from '@/lib/context/current-team';
import { generateAndStoreSkillProfile } from '@/lib/ai/skill-profile';

// analyzeSkills（全期間・15スキル）は数十秒かかる。Vercel Pro の上限まで確保して timeout を回避
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { teamSlug } = await request.json();
  if (!teamSlug) {
    return Response.json({ error: 'チーム情報がありません' }, { status: 400 });
  }

  const team = await resolveTeamFromSlug(teamSlug);

  try {
    const result = await generateAndStoreSkillProfile(user.id, team.teamId);
    if (!result.ok) {
      // データ不足は正常系として 200 で理由を返す
      return Response.json({
        error:
          'まだ活動の記録が少ないため分析できませんでした。目標や活動、振り返りをもう少し書いてから試してみてください。',
      });
    }
    return Response.json({ profile: result.profile });
  } catch (e) {
    console.error('my-skill-profile 生成エラー:', e);
    // 【一時】原因特定のためエラー詳細を返す（確定後に汎用文言へ戻す）
    return Response.json(
      { error: '分析エラー詳細: ' + String((e as any)?.message || e).slice(0, 300) },
      { status: 500 },
    );
  }
}
