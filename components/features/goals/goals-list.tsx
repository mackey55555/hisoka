'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate, isDeadlineNear, isDeadlinePassed } from '@/lib/utils/helpers';

interface Goal {
  id: string;
  content: string;
  deadline: string;
  status: string;
  created_at: string;
}

interface GoalsListProps {
  initialGoals: Goal[];
}

export function GoalsList({ initialGoals }: GoalsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 検索フィルタリング
  const filteredGoals = useMemo(() => {
    if (!searchQuery.trim()) {
      return initialGoals;
    }

    const query = searchQuery.toLowerCase().trim();
    return initialGoals.filter((goal) =>
      goal.content.toLowerCase().includes(query)
    );
  }, [initialGoals, searchQuery]);

  return (
    <>
      {/* 検索バー */}
      <div className="mb-6">
        <div className="relative">
          <Input
            type="text"
            placeholder="目標を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 検索結果数表示 */}
      {searchQuery.trim() && (
        <div className="mb-4 text-sm text-text-secondary">
          {filteredGoals.length}件の目標が見つかりました
        </div>
      )}


      {/* 目標一覧 */}
      {filteredGoals.length > 0 ? (
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
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
            {searchQuery.trim()
              ? '検索条件に一致する目標が見つかりませんでした'
              : 'まだ目標がありません'}
          </p>
        </Card>
      )}
    </>
  );
}

