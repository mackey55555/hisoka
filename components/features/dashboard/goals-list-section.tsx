'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import {
  formatDate,
  daysUntilDeadline,
  isDeadlineNear,
  isDeadlinePassed,
} from '@/lib/utils/helpers';
import { useCurrentTeam } from '@/lib/context/current-team-client';

interface Goal {
  id: string;
  content: string;
  deadline: string;
  status: string;
  created_at: string;
}

interface GoalStats {
  activityCount: number;
  reflectionCount: number;
  lastActivityAt: string | null;
}

interface GoalsListSectionProps {
  goals: Goal[];
  statsByGoalId?: Record<string, GoalStats>;
}

function daysAgoLabel(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return '今日';
  if (diff === 1) return '昨日';
  return `${diff}日前`;
}

export function GoalsListSection({ goals, statsByGoalId = {} }: GoalsListSectionProps) {
  const { slug } = useCurrentTeam();

  const inProgress = goals.filter((g) => g.status === 'in_progress');
  const others = goals.filter((g) => g.status !== 'in_progress');

  const renderGoal = (goal: Goal) => {
    const stats = statsByGoalId[goal.id];
    const near = isDeadlineNear(goal.deadline);
    const passed = isDeadlinePassed(goal.deadline);
    const daysLeft = daysUntilDeadline(goal.deadline);

    return (
      <Link
        key={goal.id}
        href={`/t/${slug}/goals/${goal.id}`}
        className="block"
      >
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-text-primary mb-2 break-words">
                {goal.content}
              </h3>
              <div className="flex items-center gap-x-3 gap-y-1 text-xs text-text-secondary flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded whitespace-nowrap ${
                    goal.status === 'achieved'
                      ? 'bg-success/20 text-success'
                      : goal.status === 'cancelled'
                      ? 'bg-text-secondary/20 text-text-secondary'
                      : passed
                      ? 'bg-error/20 text-error'
                      : near
                      ? 'bg-warning/20 text-warning'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  {goal.status === 'achieved'
                    ? '達成'
                    : goal.status === 'cancelled'
                    ? '中止'
                    : passed
                    ? '期限切れ'
                    : near
                    ? '期限間近'
                    : '進行中'}
                </span>
                <span className="whitespace-nowrap">
                  期限 {formatDate(goal.deadline)}
                  {goal.status === 'in_progress' && (
                    <span className="ml-1">
                      ({daysLeft > 0
                        ? `残り${daysLeft}日`
                        : daysLeft === 0
                        ? '今日まで'
                        : `${-daysLeft}日経過`})
                    </span>
                  )}
                </span>
                {stats && (
                  <>
                    <span className="whitespace-nowrap">
                      活動 {stats.activityCount} ／ 振返 {stats.reflectionCount}
                    </span>
                    <span className="whitespace-nowrap">
                      最終活動{' '}
                      {stats.lastActivityAt
                        ? daysAgoLabel(stats.lastActivityAt)
                        : 'なし'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-text-primary mb-4">目標一覧</h2>
      {goals.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-center py-8">
            まだ目標がありません
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {inProgress.map(renderGoal)}
          {others.length > 0 && inProgress.length > 0 && (
            <div className="pt-3 border-t border-border/60">
              <p className="text-xs text-text-secondary mb-2">過去の目標</p>
            </div>
          )}
          {others.map(renderGoal)}
        </div>
      )}
    </div>
  );
}
