'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkillEvidenceSection } from '@/components/features/ai/skill-evidence-section';
import type { UserSkillProfile, AiDiagnosis } from '@/types';

interface MySkillCardProps {
  teamSlug: string;
  initial: UserSkillProfile | null;
}

export function MySkillCard({ teamSlug, initial }: MySkillCardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserSkillProfile | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/my-skill-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSlug }),
      });
      // タイムアウト時などは JSON でない応答（504等）が返るため text で受ける
      const raw = await res.text();
      let body: { error?: string; profile?: UserSkillProfile } | null = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = null;
      }
      if (!res.ok || body?.error) {
        setError(
          body?.error ||
            `分析に失敗しました（HTTP ${res.status}）。時間がかかりすぎた可能性があります。`,
        );
        return;
      }
      if (!body?.profile) {
        setError('分析結果を取得できませんでした。もう一度お試しください。');
        return;
      }
      setProfile(body.profile);
      router.refresh();
    } catch {
      setError('分析に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // 未生成: 見つけるボタン
  if (!profile) {
    return (
      <Card className="mb-6">
        <h3 className="text-lg font-bold text-text-primary mb-1">あなたの密かなスキル</h3>
        <p className="text-base text-text-secondary mb-4">
          これまで書いてきた目標・活動・振り返りから、数字に表れない“密かな”力をAIが見つけます。
        </p>
        {error && <p className="text-base text-error mb-3">{error}</p>}
        <Button variant="primary" onClick={run} disabled={loading}>
          {loading ? '分析中…（30秒ほどかかります）' : '密かなスキルを見つける'}
        </Button>
      </Card>
    );
  }

  // 生成済み: プロファイル表示 ＋ 更新
  const fakeDiagnosis = { skill_evidence: profile.skill_evidence } as unknown as AiDiagnosis;
  const analyzed = new Date(profile.analyzed_at);

  return (
    <div className="mb-6">
      <SkillEvidenceSection
        diagnosis={fakeDiagnosis}
        title="あなたの密かなスキル"
        intro="これまでの記録から見えてきた、あなたの“密かな”力です。書き続けるほど、見える力も増えていきます。"
      />
      <div className="flex items-center justify-end gap-3 px-1 -mt-3">
        {error && <span className="text-sm text-error">{error}</span>}
        <span className="text-sm text-text-secondary">
          更新: {analyzed.toLocaleDateString('ja-JP')}
        </span>
        <button
          onClick={run}
          disabled={loading}
          className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
        >
          {loading ? '更新中…' : '最新の記録で更新する'}
        </button>
      </div>
    </div>
  );
}
