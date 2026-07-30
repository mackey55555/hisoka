'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface MonthNavigatorProps {
  year: number;
  month: number;
  basePath: string;
  /** 閲覧可能な最古の年月（Free等）。これより前へは遷移できない。未指定=無制限 */
  minYear?: number;
  minMonth?: number;
}

export function MonthNavigator({ year, month, basePath, minYear, minMonth }: MonthNavigatorProps) {
  const router = useRouter();

  // 最古月に到達しているか（前月ボタンを無効化）
  const atMin =
    minYear != null && minMonth != null &&
    year <= minYear && (year < minYear || month <= minMonth);

  const navigate = (y: number, m: number) => {
    router.push(`${basePath}?year=${y}&month=${m}`);
  };

  const handlePrev = () => {
    if (atMin) return;
    if (month === 1) {
      navigate(year - 1, 12);
    } else {
      navigate(year, month - 1);
    }
  };

  const handleNext = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 未来の月には進めない
    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      return;
    }

    if (month === 12) {
      navigate(year + 1, 1);
    } else {
      navigate(year, month + 1);
    }
  };

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <button
        onClick={handlePrev}
        disabled={atMin}
        className={`p-2 rounded-lg transition-colors ${
          atMin ? 'text-border cursor-not-allowed' : 'hover:bg-background text-text-primary'
        }`}
        aria-label="前月"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 className="text-xl font-bold text-text-primary">
        AI診断 {year}年{month}月
      </h2>
      <button
        onClick={handleNext}
        disabled={isCurrentMonth}
        className={`p-2 rounded-lg transition-colors ${
          isCurrentMonth
            ? 'text-border cursor-not-allowed'
            : 'hover:bg-background text-text-primary'
        }`}
        aria-label="次月"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
