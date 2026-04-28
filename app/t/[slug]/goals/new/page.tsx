'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { createGoal } from '@/lib/actions/goals';
import { useCurrentTeam } from '@/lib/context/current-team-client';

export default function NewGoalPage() {
  const router = useRouter();
  const { slug } = useCurrentTeam();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createGoal(slug, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    window.location.href = `/t/${slug}/dashboard`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-6 mt-4">新規目標作成</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Textarea
            label="目標内容"
            name="content"
            rows={6}
            required
            disabled={loading}
            placeholder="達成したい目標を詳しく記入してください"
          />
          <Input
            type="date"
            label="期限"
            name="deadline"
            required
            disabled={loading}
            min={new Date().toISOString().split('T')[0]}
          />
          {error && (
            <div className="text-error text-sm">{error}</div>
          )}
          <div className="flex gap-4">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? '作成中...' : '作成'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

