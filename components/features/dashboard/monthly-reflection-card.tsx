'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/utils/helpers';
import { upsertMyMonthlyReflection } from '@/lib/actions/monthly-reflections';
import type { MonthlyReflection } from '@/types';

interface Props {
  teamSlug: string;
  year: number;
  month: number;
  initial: MonthlyReflection | null;
}

const PLACEHOLDER = `自由に書いてみましょう。例えば、こんな問いかけがヒントになるかもしれません。

・今月、印象に残った活動や気づきは？
・目標との距離感はどう感じている？
・来月、どんな自分でいたい？`;

export function MonthlyReflectionCard({ teamSlug, year, month, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await upsertMyMonthlyReflection(teamSlug, year, month, formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  const heading = `今月の振り返り（${year}年${month}月）`;

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-text-primary">{heading}</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              月に1回、全体を振り返る場所
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-sm flex-shrink-0"
            onClick={() => {
              setError('');
              setOpen(true);
            }}
          >
            {initial ? '編集' : '+ 書く'}
          </Button>
        </div>

        {initial ? (
          <>
            <p className="text-sm text-text-primary whitespace-pre-wrap break-words">
              {initial.content}
            </p>
            <p className="mt-3 text-xs text-text-secondary">
              最終更新: {formatDateTime(initial.updated_at)}
            </p>
          </>
        ) : (
          <div className="py-6 text-center bg-background/60 rounded-lg">
            <p className="text-sm text-text-secondary mb-3">
              今月の振り返りはまだありません
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setError('');
                setOpen(true);
              }}
              className="text-sm"
            >
              書いてみる
            </Button>
          </div>
        )}
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={initial ? `振り返りを編集（${year}年${month}月）` : `今月の振り返りを書く（${year}年${month}月）`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            label="振り返り"
            name="content"
            rows={12}
            defaultValue={initial?.content || ''}
            required
            disabled={loading}
            placeholder={PLACEHOLDER}
            autoFocus
          />
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '保存中...' : '保存'}
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
