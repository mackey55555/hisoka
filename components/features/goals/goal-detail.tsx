'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { formatDate, formatDateTime } from '@/lib/utils/helpers';
import { updateGoal, deleteGoal } from '@/lib/actions/goals';
import { createActivity, getActivitiesByGoalId } from '@/lib/actions/activities';
import { createReflection, getReflectionsByActivityId } from '@/lib/actions/reflections';
import type { Goal, Activity, Reflection } from '@/types';

interface GoalDetailProps {
  goal: Goal;
  activities: Activity[];
}

export function GoalDetail({ goal, activities: initialActivities }: GoalDetailProps) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [reflections, setReflections] = useState<Record<string, Reflection[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!confirm('この目標を削除しますか？')) return;

    setLoading(true);
    const result = await deleteGoal(goal.id);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Server Componentsのキャッシュを確実に更新するためフルリロードで遷移
    window.location.href = '/dashboard';
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateGoal(goal.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setIsEditModalOpen(false);
    router.refresh();
  };

  const handleActivitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('goal_id', goal.id);
    const result = await createActivity(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // 最新の活動記録を取得して状態を更新
    const { data: updatedActivities } = await getActivitiesByGoalId(goal.id);
    if (updatedActivities) {
      setActivities(updatedActivities);
    }

    setIsActivityModalOpen(false);
    setLoading(false);
    // フォームをリセット（nullチェック付き）
    if (form) {
      form.reset();
    }
  };

  const handleReflectionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedActivityId) return;

    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('activity_id', selectedActivityId);
    const result = await createReflection(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // 最新の振り返りを取得して状態を更新
    const { data: updatedReflections } = await getReflectionsByActivityId(selectedActivityId);
    if (updatedReflections) {
      setReflections(prev => ({ ...prev, [selectedActivityId]: updatedReflections }));
    }

    setIsReflectionModalOpen(false);
    setSelectedActivityId(null);
    setLoading(false);
    // フォームをリセット（nullチェック付き）
    if (form) {
      form.reset();
    }
  };

  const loadReflections = async (activityId: string) => {
    if (reflections[activityId]) return;

    const { data } = await getReflectionsByActivityId(activityId);
    if (data) {
      setReflections(prev => ({ ...prev, [activityId]: data }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 mt-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ← 戻る
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              {goal.content}
            </h1>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>期限: {formatDate(goal.deadline)}</span>
              <span
                className={`px-2 py-1 rounded ${
                  goal.status === 'achieved'
                    ? 'bg-success/20 text-success'
                    : goal.status === 'cancelled'
                    ? 'bg-text-secondary/20 text-text-secondary'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {goal.status === 'achieved'
                  ? '達成'
                  : goal.status === 'cancelled'
                  ? '中止'
                  : '進行中'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(true)}
            >
              編集
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={loading}
            >
              削除
            </Button>
          </div>
        </div>
      </Card>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">活動記録</h2>
          <Button
            variant="primary"
            onClick={() => setIsActivityModalOpen(true)}
          >
            + 活動記録を追加
          </Button>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <Card key={activity.id}>
                <div className="mb-3">
                  <p className="text-text-primary whitespace-pre-wrap">
                    {activity.content}
                  </p>
                  <p className="text-sm text-text-secondary mt-2">
                    {formatDateTime(activity.created_at)}
                  </p>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    className="text-sm"
                    onClick={() => {
                      setSelectedActivityId(activity.id);
                      setIsReflectionModalOpen(true);
                      loadReflections(activity.id);
                    }}
                  >
                    + 振り返りを追加
                  </Button>
                  {reflections[activity.id] && reflections[activity.id].length > 0 && (
                    <div className="mt-4 space-y-3">
                      {reflections[activity.id].map((reflection) => (
                        <div
                          key={reflection.id}
                          className="pl-4 border-l-2 border-primary/30"
                        >
                          <p className="text-text-primary whitespace-pre-wrap">
                            {reflection.content}
                          </p>
                          <p className="text-sm text-text-secondary mt-1">
                            {formatDateTime(reflection.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">
              まだ活動記録がありません
            </p>
          </Card>
        )}
      </div>

      {/* 編集モーダル */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="目標を編集"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Textarea
            label="目標内容"
            name="content"
            rows={6}
            defaultValue={goal.content}
            required
            disabled={loading}
          />
          <Input
            type="date"
            label="期限"
            name="deadline"
            defaultValue={goal.deadline}
            required
            disabled={loading}
          />
          <select
            name="status"
            defaultValue={goal.status}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            disabled={loading}
          >
            <option value="in_progress">進行中</option>
            <option value="achieved">達成</option>
            <option value="cancelled">中止</option>
          </select>
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Modal>

      {/* 活動記録追加モーダル */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="活動記録を追加"
      >
        <form onSubmit={handleActivitySubmit} className="space-y-4">
          <Textarea
            label="活動内容"
            name="content"
            rows={6}
            required
            disabled={loading}
            placeholder="実施した活動の詳細を記入してください"
          />
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '作成中...' : '作成'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsActivityModalOpen(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Modal>

      {/* 振り返り追加モーダル */}
      <Modal
        isOpen={isReflectionModalOpen}
        onClose={() => {
          setIsReflectionModalOpen(false);
          setSelectedActivityId(null);
        }}
        title="振り返りを追加"
      >
        <form onSubmit={handleReflectionSubmit} className="space-y-4">
          <Textarea
            label="振り返り内容"
            name="content"
            rows={6}
            required
            disabled={loading}
            placeholder="トレーナーとの対話内容や気づきを記入してください"
          />
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '作成中...' : '作成'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsReflectionModalOpen(false);
                setSelectedActivityId(null);
              }}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

