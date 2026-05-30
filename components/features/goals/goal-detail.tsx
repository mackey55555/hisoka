'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { formatDate, formatDateTime, formatMonthKey, formatMonthLabel } from '@/lib/utils/helpers';
import { updateGoal, deleteGoal } from '@/lib/actions/goals';
import { createActivity, updateActivity, deleteActivity, getActivitiesByGoalId } from '@/lib/actions/activities';
import { createReflection, updateReflection, deleteReflection, getReflectionsByActivityId } from '@/lib/actions/reflections';
import { ReflectionChat } from '@/components/features/ai/reflection-chat';
import { useCurrentTeam } from '@/lib/context/current-team-client';
import type { Goal, Activity, Reflection, AiDiagnosis } from '@/types';

interface GoalDetailProps {
  goal: Goal;
  activities: Activity[];
  initialReflections?: Record<string, Reflection[]>;
  diagnosis?: AiDiagnosis | null;
}

export function GoalDetail({ goal, activities: initialActivities, initialReflections = {}, diagnosis = null }: GoalDetailProps) {
  const router = useRouter();
  const { slug: teamSlug } = useCurrentTeam();
  const [activities, setActivities] = useState(initialActivities);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [isActivityEditModalOpen, setIsActivityEditModalOpen] = useState(false);
  const [isReflectionEditModalOpen, setIsReflectionEditModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);
  const [reflections, setReflections] = useState<Record<string, Reflection[]>>(initialReflections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAiChat, setShowAiChat] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    if (initialActivities.length === 0) return new Set();
    return new Set([formatMonthKey(initialActivities[0].created_at)]);
  });

  const groupedActivities = useMemo(() => {
    const groups = new Map<string, { label: string; activities: Activity[] }>();
    for (const activity of activities) {
      const key = formatMonthKey(activity.created_at);
      if (!groups.has(key)) {
        groups.set(key, {
          label: formatMonthLabel(activity.created_at),
          activities: [],
        });
      }
      groups.get(key)!.activities.push(activity);
    }
    return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }));
  }, [activities]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const countReflections = (acts: Activity[]) =>
    acts.reduce((sum, a) => sum + (reflections[a.id]?.length ?? 0), 0);

  const stats = useMemo(() => {
    const thisMonthKey = formatMonthKey(new Date());
    const allReflections = Object.values(reflections).flat();
    return {
      activitiesTotal: activities.length,
      activitiesThisMonth: activities.filter(
        (a) => formatMonthKey(a.created_at) === thisMonthKey
      ).length,
      reflectionsTotal: allReflections.length,
      reflectionsThisMonth: allReflections.filter(
        (r) => formatMonthKey(r.created_at) === thisMonthKey
      ).length,
    };
  }, [activities, reflections]);

  const sentimentPercent = diagnosis
    ? {
        positive: Math.round(diagnosis.sentiment_positive_ratio * 100),
        negative: Math.round(diagnosis.sentiment_negative_ratio * 100),
        neutral: Math.round(diagnosis.sentiment_neutral_ratio * 100),
      }
    : null;

  const handleDelete = async () => {
    if (!confirm('この目標を削除しますか？')) return;

    setLoading(true);
    const result = await deleteGoal(teamSlug, goal.id);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    window.location.href = `/t/${teamSlug}/dashboard`;
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateGoal(teamSlug, goal.id, formData);

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
    const result = await createActivity(teamSlug, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { data: updatedActivities } = await getActivitiesByGoalId(teamSlug, goal.id);
    if (updatedActivities) {
      setActivities(updatedActivities);
    }

    setExpandedMonths((prev) => new Set([...prev, formatMonthKey(new Date())]));

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
    const result = await createReflection(teamSlug, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { data: updatedReflections } = await getReflectionsByActivityId(teamSlug, selectedActivityId);
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

    const { data } = await getReflectionsByActivityId(teamSlug, activityId);
    if (data) {
      setReflections(prev => ({ ...prev, [activityId]: data }));
    }
  };

  // 初期表示時の振り返り読み込みは不要（サーバーサイドで取得済み）

  const handleActivityEdit = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsActivityEditModalOpen(true);
  };

  const handleActivityEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedActivity) return;

    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await updateActivity(teamSlug, selectedActivity.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { data: updatedActivities } = await getActivitiesByGoalId(teamSlug, goal.id);
    if (updatedActivities) {
      setActivities(updatedActivities);
    }

    setIsActivityEditModalOpen(false);
    setSelectedActivity(null);
    setLoading(false);
    if (form) {
      form.reset();
    }
  };

  const handleActivityDelete = async (activityId: string) => {
    if (!confirm('この活動記録を削除しますか？')) return;

    setLoading(true);
    const result = await deleteActivity(teamSlug, activityId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { data: updatedActivities } = await getActivitiesByGoalId(teamSlug, goal.id);
    if (updatedActivities) {
      setActivities(updatedActivities);
    }

    setLoading(false);
  };

  const handleReflectionEdit = (reflection: Reflection) => {
    setSelectedReflection(reflection);
    setSelectedActivityId(reflection.activity_id);
    setIsReflectionEditModalOpen(true);
  };

  const handleReflectionEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReflection || !selectedActivityId) return;

    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await updateReflection(teamSlug, selectedReflection.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { data: updatedReflections } = await getReflectionsByActivityId(teamSlug, selectedActivityId);
    if (updatedReflections) {
      setReflections(prev => ({ ...prev, [selectedActivityId]: updatedReflections }));
    }

    setIsReflectionEditModalOpen(false);
    setSelectedReflection(null);
    setLoading(false);
    if (form) {
      form.reset();
    }
  };

  const handleReflectionDelete = async (reflectionId: string, activityId: string) => {
    if (!confirm('この振り返りを削除しますか？')) return;

    setLoading(true);
    const result = await deleteReflection(teamSlug, reflectionId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { data: updatedReflections } = await getReflectionsByActivityId(teamSlug, activityId);
    if (updatedReflections) {
      setReflections(prev => ({ ...prev, [activityId]: updatedReflections }));
    }

    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6 mt-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ← 戻る
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary break-words flex-1">
                {goal.content}
              </h1>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                  aria-label="編集"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="p-1.5 text-text-secondary hover:text-error transition-colors disabled:opacity-50"
                  aria-label="削除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-sm text-text-secondary flex-wrap">
              <span className="whitespace-nowrap">期限: {formatDate(goal.deadline)}</span>
              <span
                className={`px-2 py-1 rounded whitespace-nowrap ${
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

        {groupedActivities.length > 0 ? (
          <div className="space-y-6">
            {groupedActivities.map((group) => {
              const isExpanded = expandedMonths.has(group.key);
              const reflectionCount = countReflections(group.activities);
              return (
                <section key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleMonth(group.key)}
                    className="sticky top-0 z-10 w-full flex items-center gap-3 px-3 py-2 bg-background/95 backdrop-blur border-b border-border hover:bg-bg-secondary/50 transition-colors text-left"
                    aria-expanded={isExpanded}
                  >
                    <svg
                      className={`w-4 h-4 text-text-secondary transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <h3 className="text-base font-bold text-text-primary flex-1">
                      {group.label}
                    </h3>
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      活動 {group.activities.length} ／ 振り返り {reflectionCount}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="mt-4 space-y-4">
                      {group.activities.map((activity) => (
                        <Card key={activity.id}>
                          <div className="mb-3">
                            <div className="flex items-start gap-2 mb-2">
                              <p className="text-text-primary whitespace-pre-wrap break-words flex-1">
                                {activity.content}
                              </p>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleActivityEdit(activity)}
                                  disabled={loading}
                                  className="p-1.5 text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
                                  aria-label="編集"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleActivityDelete(activity.id)}
                                  disabled={loading}
                                  className="p-1.5 text-text-secondary hover:text-error transition-colors disabled:opacity-50"
                                  aria-label="削除"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-text-secondary whitespace-nowrap">
                              {formatDateTime(activity.created_at)}
                            </p>
                          </div>
                          <div>
                            {(!reflections[activity.id] || reflections[activity.id].length === 0) && (
                              <Button
                                variant="ghost"
                                className="text-sm"
                                onClick={() => {
                                  setSelectedActivityId(activity.id);
                                  setIsReflectionModalOpen(true);
                                  loadReflections(activity.id);
                                }}
                              >
                                + 振り返りを書く
                              </Button>
                            )}
                            {reflections[activity.id] && reflections[activity.id].length > 0 && (
                              <div className="mt-4 space-y-3">
                                {reflections[activity.id].map((reflection) => (
                                  <div
                                    key={reflection.id}
                                    className="pl-4 border-l-2 border-primary/30"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-2 mb-1">
                                          <p className="text-text-primary whitespace-pre-wrap break-words flex-1">
                                            {reflection.content}
                                          </p>
                                          <div className="flex gap-1 flex-shrink-0">
                                            <button
                                              onClick={() => handleReflectionEdit(reflection)}
                                              disabled={loading}
                                              className="p-1 text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
                                              aria-label="編集"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => handleReflectionDelete(reflection.id, activity.id)}
                                              disabled={loading}
                                              className="p-1 text-text-secondary hover:text-error transition-colors disabled:opacity-50"
                                              aria-label="削除"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-sm text-text-secondary whitespace-nowrap">
                                          {formatDateTime(reflection.created_at)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">
              まだ活動記録がありません
            </p>
          </Card>
        )}
      </div>
        </div>

        <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <h3 className="text-base font-bold text-text-primary mb-3">書くときのヒント</h3>

            <div className="mb-4">
              <p className="text-xs font-bold text-text-secondary mb-1.5">活動記録</p>
              <ul className="text-sm text-text-primary space-y-1 list-disc pl-4">
                <li>いつ・何を・どれくらい やったかを具体的に</li>
                <li>できなかったことも書いてOK</li>
                <li>1〜2行でも十分です</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold text-text-secondary mb-1.5">振り返り</p>
              <ul className="text-sm text-text-primary space-y-1 list-disc pl-4">
                <li>そのときどんな気持ちだったか</li>
                <li>うまくいった/いかなかった理由</li>
                <li>次にどう活かすか</li>
              </ul>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">
                AI
              </span>
              <h3 className="text-base font-bold text-text-primary">総合評価</h3>
              <span className="ml-auto text-xs text-text-secondary">あなた全体・今月</span>
            </div>
            {diagnosis ? (
              <>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {diagnosis.summary}
                </p>
                <p className="mt-3 text-xs text-text-secondary">
                  最終更新: {formatDate(diagnosis.analyzed_at)}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-secondary leading-relaxed">
                今月のAI分析はまだありません。月末に向けて活動と振り返りを書き溜めていきましょう。
              </p>
            )}
            <p className="mt-3 pt-3 border-t border-border text-xs text-text-secondary leading-relaxed">
              ※ この目標だけでなく、あなた全体の今月の振り返りから生成されています。
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">定量評価</h3>
              <span className="text-xs text-text-secondary">今月／累計</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-text-secondary mb-1">活動の数</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums leading-none">
                  {stats.activitiesThisMonth}
                  <span className="text-sm text-text-secondary font-normal ml-1">件</span>
                </p>
                <p className="text-xs text-text-secondary mt-1">累計 {stats.activitiesTotal} 件</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-text-secondary mb-1">振り返りの数</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums leading-none">
                  {stats.reflectionsThisMonth}
                  <span className="text-sm text-text-secondary font-normal ml-1">件</span>
                </p>
                <p className="text-xs text-text-secondary mt-1">累計 {stats.reflectionsTotal} 件</p>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm text-text-primary">振り返りの言葉の傾向</p>
                <span className="text-xs text-text-secondary">あなた全体・今月</span>
              </div>
              {sentimentPercent ? (
                <>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-background">
                    <div className="bg-primary" style={{ width: `${sentimentPercent.positive}%` }} />
                    <div className="bg-accent" style={{ width: `${sentimentPercent.negative}%` }} />
                    <div className="bg-text-secondary/30" style={{ width: `${sentimentPercent.neutral}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-text-primary">
                      <span className="w-2 h-2 rounded-sm bg-primary" />
                      ポジティブ <span className="tabular-nums text-text-secondary">{sentimentPercent.positive}%</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-text-primary">
                      <span className="w-2 h-2 rounded-sm bg-accent" />
                      ネガティブ <span className="tabular-nums text-text-secondary">{sentimentPercent.negative}%</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-text-primary">
                      <span className="w-2 h-2 rounded-sm bg-text-secondary/30" />
                      中立 <span className="tabular-nums text-text-secondary">{sentimentPercent.neutral}%</span>
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-secondary leading-relaxed">
                  今月の分析データはまだありません。
                </p>
              )}
            </div>

            <p className="text-xs text-text-secondary leading-relaxed pt-3 border-t border-border">
              ※ ポジティブ／ネガティブは「どちらが良い・悪い」を示すものではありません。今のあなたの状態を理解するための手がかりです。
            </p>
          </Card>

        </aside>
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
          <div className="p-3 bg-bg-secondary rounded-lg text-sm">
            <p className="text-text-secondary text-xs mb-1">目標</p>
            <p className="text-text-primary whitespace-pre-wrap">{goal.content}</p>
          </div>
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
          setShowAiChat(false);
        }}
        title="振り返りを追加"
      >
        <form onSubmit={handleReflectionSubmit} className="space-y-4">
          {selectedActivityId && (
            <div className="p-3 bg-bg-secondary rounded-lg text-sm">
              <p className="text-text-secondary text-xs mb-1">活動内容</p>
              <p className="text-text-primary whitespace-pre-wrap">{activities.find((a) => a.id === selectedActivityId)?.content}</p>
            </div>
          )}
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
              variant="ghost"
              onClick={() => setShowAiChat(!showAiChat)}
              className="text-primary text-sm"
            >
              {showAiChat ? '閉じる' : '振り返りを深めるお手伝い'}
            </Button>
          </div>
          {showAiChat && selectedActivityId && (
            <ReflectionChat
              goalContent={goal.content}
              activityContent={
                activities.find((a) => a.id === selectedActivityId)?.content || ''
              }
              reflectionDraft=""
              onClose={() => setShowAiChat(false)}
            />
          )}
        </form>
      </Modal>

      {/* 活動記録編集モーダル */}
      <Modal
        isOpen={isActivityEditModalOpen}
        onClose={() => {
          setIsActivityEditModalOpen(false);
          setSelectedActivity(null);
        }}
        title="活動記録を編集"
      >
        <form onSubmit={handleActivityEditSubmit} className="space-y-4">
          <Textarea
            label="活動内容"
            name="content"
            rows={6}
            defaultValue={selectedActivity?.content || ''}
            required
            disabled={loading}
            placeholder="実施した活動の詳細を記入してください"
          />
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsActivityEditModalOpen(false);
                setSelectedActivity(null);
              }}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Modal>

      {/* 振り返り編集モーダル */}
      <Modal
        isOpen={isReflectionEditModalOpen}
        onClose={() => {
          setIsReflectionEditModalOpen(false);
          setSelectedReflection(null);
        }}
        title="振り返りを編集"
      >
        <form onSubmit={handleReflectionEditSubmit} className="space-y-4">
          {selectedActivityId && (
            <div className="p-3 bg-bg-secondary rounded-lg text-sm">
              <p className="text-text-secondary text-xs mb-1">活動内容</p>
              <p className="text-text-primary whitespace-pre-wrap">{activities.find((a) => a.id === selectedActivityId)?.content}</p>
            </div>
          )}
          <Textarea
            label="振り返り内容"
            name="content"
            rows={8}
            defaultValue={selectedReflection?.content || ''}
            required
            disabled={loading}
            placeholder="トレーナーとの対話内容や気づきを記入してください"
          />
          <p className="text-xs text-text-secondary">
            追記したい場合は、本文の末尾に追加して保存してください
          </p>
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsReflectionEditModalOpen(false);
                setSelectedReflection(null);
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

