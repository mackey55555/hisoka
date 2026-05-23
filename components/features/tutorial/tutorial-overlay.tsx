'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createTutorialGoal,
  createTutorialActivity,
  createTutorialReflection,
  cancelTutorial,
} from '@/lib/actions/tutorial';

type Step = 1 | 2 | 3 | 4 | 'done';

interface Props {
  teamSlug: string;
  onClose: () => void;
}

const TOTAL_STEPS = 4;

export function TutorialOverlay({ teamSlug, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm('チュートリアルを終了します。途中まで作成したデータも破棄されます。よろしいですか？')) {
      return;
    }
    startTransition(async () => {
      await cancelTutorial(teamSlug, { goalId });
      onClose();
    });
  };

  const handleGoalCreate = (content: string, deadline: string) => {
    setError('');
    startTransition(async () => {
      const res = await createTutorialGoal(teamSlug, { content, deadline });
      if (res.error || !res.goalId) {
        setError(res.error ?? '目標の作成に失敗しました');
        return;
      }
      setGoalId(res.goalId);
      setStep(3);
    });
  };

  const handleActivityCreate = (content: string) => {
    if (!goalId) {
      setError('目標が見つかりません');
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await createTutorialActivity(teamSlug, { goalId, content });
      if (res.error || !res.activityId) {
        setError(res.error ?? '活動の作成に失敗しました');
        return;
      }
      setActivityId(res.activityId);
      setStep(4);
    });
  };

  const handleReflectionCreate = (content: string) => {
    if (!activityId) {
      setError('活動が見つかりません');
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await createTutorialReflection(teamSlug, {
        activityId,
        content,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setStep('done');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="bg-surface rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step !== 'done' && (
          <div className="px-6 pt-6">
            <ProgressBar current={step} total={TOTAL_STEPS} />
          </div>
        )}
        <div className="p-6">
          {step === 1 && <StepWelcome onNext={() => setStep(2)} onSkip={handleCancel} />}
          {step === 2 && (
            <StepGoal
              onSubmit={handleGoalCreate}
              onSkip={handleCancel}
              pending={pending}
              error={error}
            />
          )}
          {step === 3 && (
            <StepActivity
              onSubmit={handleActivityCreate}
              onBack={() => setStep(2)}
              onSkip={handleCancel}
              pending={pending}
              error={error}
            />
          )}
          {step === 4 && (
            <StepReflection
              onSubmit={handleReflectionCreate}
              onBack={() => setStep(3)}
              onSkip={handleCancel}
              pending={pending}
              error={error}
            />
          )}
          {step === 'done' && <StepDone onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = (current / total) * 100;
  return (
    <div>
      <div className="flex justify-between mb-2 text-sm text-text-secondary">
        <span>
          ステップ {current} / {total}
        </span>
      </div>
      <div className="w-full bg-border rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StepWelcome({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-4">
        Hisoka へようこそ 🎉
      </h2>
      <p className="text-text-secondary mb-6 leading-relaxed">
        Hisoka では <strong>目標</strong> → <strong>活動記録</strong> → <strong>振り返り</strong> の流れで、日々の歩みを積み上げていきます。
      </p>
      <div className="bg-background border border-border rounded-lg p-5 mb-6 text-sm leading-relaxed">
        <p className="mb-2">
          <strong>1. 目標</strong>を立てる：達成したいことを具体的に書く
        </p>
        <p className="mb-2">
          <strong>2. 活動</strong>を記録する：目標に向けて何をしたかを記す
        </p>
        <p>
          <strong>3. 振り返り</strong>を書く：気づきや学びを残す
        </p>
      </div>
      <p className="text-text-secondary mb-6">
        このチュートリアルでは、実際にひとつずつ作ってみます。所要時間は約3分です。
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onSkip}>
          スキップ
        </Button>
        <Button variant="primary" onClick={onNext}>
          はじめる
        </Button>
      </div>
    </div>
  );
}

function StepGoal({
  onSubmit,
  onSkip,
  pending,
  error,
}: {
  onSubmit: (content: string, deadline: string) => void;
  onSkip: () => void;
  pending: boolean;
  error: string;
}) {
  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit(fd.get('content') as string, fd.get('deadline') as string);
  };

  const today = new Date().toISOString().split('T')[0];
  // 3ヶ月後をデフォルト期限に
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const defaultDeadline = threeMonthsLater.toISOString().split('T')[0];

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        ステップ 2: 最初の目標を作ろう
      </h2>
      <p className="text-text-secondary text-sm mb-6">
        達成したいことを書いてみてください。後から編集できます。
      </p>
      <form onSubmit={handle} className="space-y-4">
        <Textarea
          name="content"
          label="目標"
          rows={4}
          required
          disabled={pending}
          placeholder="例: 3ヶ月で月10冊の読書を継続する"
        />
        <Input
          type="date"
          name="deadline"
          label="期限"
          required
          disabled={pending}
          min={today}
          defaultValue={defaultDeadline}
        />
        {error && <div className="text-error text-sm">{error}</div>}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onSkip}
            disabled={pending}
          >
            スキップ
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? '作成中…' : '作成して次へ'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepActivity({
  onSubmit,
  onBack,
  onSkip,
  pending,
  error,
}: {
  onSubmit: (content: string) => void;
  onBack: () => void;
  onSkip: () => void;
  pending: boolean;
  error: string;
}) {
  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit(fd.get('content') as string);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        ステップ 3: 活動を記録しよう
      </h2>
      <p className="text-text-secondary text-sm mb-6">
        さきほど立てた目標に向けて、今日やったこと（または今からやること）を書いてみましょう。小さなことで大丈夫です。
      </p>
      <form onSubmit={handle} className="space-y-4">
        <Textarea
          name="content"
          label="活動内容"
          rows={4}
          required
          disabled={pending}
          placeholder="例: 通勤の電車で20分読書した"
        />
        {error && <div className="text-error text-sm">{error}</div>}
        <div className="flex gap-3 justify-between pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            disabled={pending}
          >
            ← 戻る
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onSkip}
              disabled={pending}
            >
              スキップ
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? '記録中…' : '記録して次へ'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StepReflection({
  onSubmit,
  onBack,
  onSkip,
  pending,
  error,
}: {
  onSubmit: (content: string) => void;
  onBack: () => void;
  onSkip: () => void;
  pending: boolean;
  error: string;
}) {
  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit(fd.get('content') as string);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        ステップ 4: 振り返りを書こう
      </h2>
      <p className="text-text-secondary text-sm mb-6">
        さきほどの活動について、感じたこと・気づいたこと・次にやりたいことを書いてみてください。
      </p>
      <form onSubmit={handle} className="space-y-4">
        <Textarea
          name="content"
          label="振り返り"
          rows={4}
          required
          disabled={pending}
          placeholder="例: 通勤時間も意外と読書できることがわかった。明日は朝の15分も試してみたい。"
        />
        {error && <div className="text-error text-sm">{error}</div>}
        <div className="flex gap-3 justify-between pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            disabled={pending}
          >
            ← 戻る
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onSkip}
              disabled={pending}
            >
              スキップ
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? '保存中…' : '完了する'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StepDone({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-text-primary mb-3">
        チュートリアル完了！
      </h2>
      <p className="text-text-secondary mb-6 leading-relaxed">
        目標・活動・振り返りの流れを体験できました。
        <br />
        作成したデータはダッシュボードでいつでも編集できます。これから一歩ずつ積み上げていきましょう。
      </p>
      <Button variant="primary" onClick={onClose}>
        ダッシュボードへ
      </Button>
    </div>
  );
}
