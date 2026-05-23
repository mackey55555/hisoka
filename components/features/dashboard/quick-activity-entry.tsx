'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { createActivity } from '@/lib/actions/activities';

interface Goal {
  id: string;
  content: string;
  status: string;
}

interface Props {
  teamSlug: string;
  goals: Goal[];
}

export function QuickActivityEntry({ teamSlug, goals }: Props) {
  const router = useRouter();
  const inProgress = goals.filter((g) => g.status === 'in_progress');

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [goalId, setGoalId] = useState<string>(inProgress[0]?.id || '');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('goal_id', goalId);
    const result = await createActivity(teamSlug, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    form.reset();
    router.refresh();
  };

  const openModal = () => {
    setError('');
    setGoalId(inProgress[0]?.id || '');
    setOpen(true);
  };

  if (inProgress.length === 0) {
    return (
      <div className="mb-6 bg-primary/5 border border-primary/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-primary flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-text-primary mb-1">
              まずは目標を作りましょう
            </p>
            <p className="text-xs text-text-secondary mb-3">
              目標があると、日々の活動が積み上がっていきます。
            </p>
            <Link href={`/t/${teamSlug}/goals/new`}>
              <Button variant="primary" className="text-sm py-2 px-4">
                + 目標を作る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="w-full mb-6 bg-primary/5 border border-primary/30 rounded-xl p-5 text-left hover:bg-primary/10 hover:border-primary/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-text-primary">
              今日の活動を記録
            </p>
            <p className="text-xs text-text-secondary truncate">
              何をしましたか？ 1〜2行でもOK
            </p>
          </div>
          <svg
            className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="今日の活動を記録"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              どの目標について？
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              {inProgress.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.content}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="活動内容"
            name="content"
            rows={5}
            required
            disabled={loading}
            placeholder="今日やったことを書いてみましょう"
            autoFocus
          />

          {error && <div className="text-error text-sm">{error}</div>}

          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={loading || !goalId}>
              {loading ? '記録中...' : '記録する'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
