'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { formatDate, isDeadlineNear, isDeadlinePassed } from '@/lib/utils/helpers';

interface Goal {
  id: string;
  content: string;
  deadline: string;
  status: string;
  created_at: string;
}

interface GoalsListSectionProps {
  goals: Goal[];
}

export function GoalsListSection({ goals }: GoalsListSectionProps) {

  return (
    <>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">目標一覧</h2>
        {goals.length > 0 ? (
          <div className="space-y-4">
            {goals.map((goal) => {
              const near = isDeadlineNear(goal.deadline);
              const passed = isDeadlinePassed(goal.deadline);

              return (
                <Link
                  key={goal.id}
                  href={`/goals/${goal.id}`}
                  className="block"
                >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-text-primary mb-2 break-words">
                        {goal.content}
                      </h3>
                        <div className="flex items-center gap-2 sm:gap-4 text-sm text-text-secondary flex-wrap">
                          <span className="whitespace-nowrap">期限: {formatDate(goal.deadline)}</span>
                          <span
                            className={`px-2 py-1 rounded whitespace-nowrap ${
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
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">
              まだ目標がありません
            </p>
          </Card>
        )}
      </div>
    </>
  );
}

