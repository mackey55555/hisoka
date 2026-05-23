'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  daysUntilDeadline,
  formatDate,
  formatDateTime,
  formatMonthKey,
  formatMonthLabel,
} from '@/lib/utils/helpers';
import type { Activity, Goal, GoalStatus, Reflection } from '@/types';

interface Props {
  goals: Goal[];
  activitiesByGoalId: Record<string, Activity[]>;
  reflectionsByActivityId: Record<string, Reflection[]>;
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  in_progress: '進行中',
  achieved: '達成',
  cancelled: '中止',
};

const STATUS_BADGE: Record<GoalStatus, string> = {
  in_progress: 'bg-primary/15 text-primary',
  achieved: 'bg-success/20 text-success',
  cancelled: 'bg-text-secondary/20 text-text-secondary',
};

const STATUS_MARKER: Record<GoalStatus, string> = {
  in_progress: 'bg-primary',
  achieved: 'bg-success',
  cancelled: 'bg-text-secondary/40',
};

function deadlineHint(deadline: string): string {
  const days = daysUntilDeadline(deadline);
  if (days > 0) return `残り${days}日`;
  if (days === 0) return '今日まで';
  return `${-days}日経過`;
}

export function TraineeProgressList({
  goals,
  activitiesByGoalId,
  reflectionsByActivityId,
}: Props) {
  const [filter, setFilter] = useState<GoalStatus | 'all'>('all');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(
    () =>
      new Set(
        goals.filter((g) => g.status === 'in_progress').map((g) => g.id)
      )
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const goal of goals) {
      if (goal.status !== 'in_progress') continue;
      const acts = activitiesByGoalId[goal.id] || [];
      if (acts.length === 0) continue;
      set.add(`${goal.id}:${formatMonthKey(acts[0].created_at)}`);
    }
    return set;
  });

  const counts = useMemo(
    () => ({
      all: goals.length,
      in_progress: goals.filter((g) => g.status === 'in_progress').length,
      achieved: goals.filter((g) => g.status === 'achieved').length,
      cancelled: goals.filter((g) => g.status === 'cancelled').length,
    }),
    [goals]
  );

  const sections = useMemo(() => {
    const filtered = filter === 'all' ? goals : goals.filter((g) => g.status === filter);
    if (filter !== 'all') {
      return [{ status: filter, items: filtered }];
    }
    return (['in_progress', 'achieved', 'cancelled'] as GoalStatus[])
      .map((s) => ({ status: s, items: filtered.filter((g) => g.status === s) }))
      .filter((sec) => sec.items.length > 0);
  }, [filter, goals]);

  const toggleGoal = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (goals.length === 0) {
    return (
      <Card>
        <p className="text-text-secondary text-center py-8">まだ目標がありません</p>
      </Card>
    );
  }

  const filterChips: Array<[GoalStatus | 'all', string, number]> = [
    ['all', 'すべて', counts.all],
    ['in_progress', '進行中', counts.in_progress],
    ['achieved', '達成', counts.achieved],
    ['cancelled', '中止', counts.cancelled],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {filterChips.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filter === key
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-text-secondary border-border hover:border-primary/40'
            }`}
          >
            {label}
            <span className={`ml-1.5 tabular-nums ${filter === key ? 'opacity-80' : ''}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-center py-8">
            該当する目標がありません
          </p>
        </Card>
      ) : (
        sections.map((section) => (
          <section key={section.status}>
            {filter === 'all' && (
              <h3 className="text-sm font-bold text-text-secondary mb-3 flex items-center gap-2">
                <span
                  className={`inline-block w-1.5 h-4 rounded-sm ${STATUS_MARKER[section.status]}`}
                />
                {STATUS_LABEL[section.status]} ({section.items.length})
              </h3>
            )}
            <div className="space-y-3">
              {section.items.map((goal) => {
                const acts = activitiesByGoalId[goal.id] || [];
                const reflectionCount = acts.reduce(
                  (sum, a) =>
                    sum + (reflectionsByActivityId[a.id]?.length || 0),
                  0
                );
                const lastActivity = acts[0];
                const isExpanded = expandedGoals.has(goal.id);

                const monthGroups: Array<{
                  key: string;
                  label: string;
                  activities: Activity[];
                }> = [];
                {
                  const map = new Map<
                    string,
                    { label: string; activities: Activity[] }
                  >();
                  for (const a of acts) {
                    const key = formatMonthKey(a.created_at);
                    if (!map.has(key)) {
                      map.set(key, {
                        label: formatMonthLabel(a.created_at),
                        activities: [],
                      });
                    }
                    map.get(key)!.activities.push(a);
                  }
                  for (const [key, value] of map.entries()) {
                    monthGroups.push({ key, ...value });
                  }
                }

                return (
                  <div
                    key={goal.id}
                    className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      className="w-full text-left p-4 hover:bg-background/50 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-start gap-3">
                        <svg
                          className={`w-4 h-4 mt-1.5 text-text-secondary transition-transform flex-shrink-0 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap mb-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${STATUS_BADGE[goal.status]}`}
                            >
                              {STATUS_LABEL[goal.status]}
                            </span>
                            <h4 className="text-base font-bold text-text-primary break-words flex-1 min-w-0">
                              {goal.content}
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                            <span>
                              期限 {formatDate(goal.deadline)}
                              {goal.status === 'in_progress' && (
                                <span className="ml-1">
                                  ({deadlineHint(goal.deadline)})
                                </span>
                              )}
                            </span>
                            <span>
                              活動 {acts.length} ／ 振り返り {reflectionCount}
                            </span>
                            {lastActivity && (
                              <span>
                                最終活動 {formatDate(lastActivity.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border">
                        {acts.length === 0 ? (
                          <p className="py-4 text-sm text-text-secondary">
                            まだ活動記録がありません
                          </p>
                        ) : (
                          <div className="space-y-4 mt-3">
                            {monthGroups.map((group) => {
                              const monthKey = `${goal.id}:${group.key}`;
                              const monthExpanded = expandedMonths.has(monthKey);
                              const reflectionCountThisMonth =
                                group.activities.reduce(
                                  (sum, a) =>
                                    sum +
                                    (reflectionsByActivityId[a.id]?.length ||
                                      0),
                                  0
                                );
                              return (
                                <div key={group.key}>
                                  <button
                                    type="button"
                                    onClick={() => toggleMonth(monthKey)}
                                    className="w-full flex items-center gap-2 py-2 border-b border-border hover:bg-background/40 transition-colors"
                                    aria-expanded={monthExpanded}
                                  >
                                    <svg
                                      className={`w-3.5 h-3.5 text-text-secondary transition-transform ${
                                        monthExpanded ? 'rotate-90' : ''
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                    <span className="text-sm font-bold text-text-primary">
                                      {group.label}
                                    </span>
                                    <span className="ml-auto text-xs text-text-secondary">
                                      活動 {group.activities.length} ／ 振り返り{' '}
                                      {reflectionCountThisMonth}
                                    </span>
                                  </button>
                                  {monthExpanded && (
                                    <div className="mt-3 space-y-4">
                                      {group.activities.map((activity) => {
                                        const refls =
                                          reflectionsByActivityId[activity.id] ||
                                          [];
                                        return (
                                          <div
                                            key={activity.id}
                                            className="pl-3"
                                          >
                                            <p className="text-sm text-text-primary whitespace-pre-wrap break-words">
                                              {activity.content}
                                            </p>
                                            <p className="text-xs text-text-secondary mt-1">
                                              {formatDateTime(
                                                activity.created_at
                                              )}
                                            </p>
                                            {refls.length > 0 && (
                                              <div className="mt-3 space-y-2">
                                                {refls.map((r) => (
                                                  <div
                                                    key={r.id}
                                                    className="pl-3 border-l-2 border-primary/30"
                                                  >
                                                    <p className="text-sm text-text-primary whitespace-pre-wrap break-words">
                                                      {r.content}
                                                    </p>
                                                    <p className="text-xs text-text-secondary mt-1">
                                                      {formatDateTime(
                                                        r.created_at
                                                      )}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
