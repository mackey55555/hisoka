import { Card } from '@/components/ui/card';
import { formatYmd } from '@/lib/utils/helpers';

interface Props {
  activityDates: string[];
}

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

function computeStreaks(dateSet: Set<string>): {
  current: number;
  longest: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = new Date(today);
  if (!dateSet.has(formatYmd(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let current = 0;
  while (dateSet.has(formatYmd(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...dateSet].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const [y, m, d] = k.split('-').map(Number);
    const cur = new Date(y, m - 1, d);
    if (prev && (cur.getTime() - prev.getTime()) / 86400000 === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = cur;
  }

  return { current, longest };
}

function buildWeekView(dateSet: Set<string>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const mondayBased = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayBased);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = formatYmd(d);
    days.push({
      date: key,
      label: DOW_LABELS[i],
      dayOfMonth: d.getDate(),
      done: dateSet.has(key),
      isToday: d.getTime() === today.getTime(),
      isFuture: d > today,
    });
  }
  return days;
}

function pickMessage(current: number, todayDone: boolean): string {
  if (todayDone) {
    if (current >= 30) return '素晴らしい習慣になっていますね';
    if (current >= 7) return 'この調子でいきましょう';
    if (current >= 2) return '連続してる！明日もどうですか';
    return '今日も書けました。明日もお待ちしてます';
  }
  if (current >= 7) return `${current}日連続中。今日も書いて続けましょう`;
  if (current > 0) return '今日も書いて、連続を保ちましょう';
  return '今日から始めてみませんか';
}

function FlameIcon({ className, active }: { className?: string; active: boolean }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {active ? (
        <path
          fillRule="evenodd"
          d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248z"
          clipRule="evenodd"
          opacity="0.4"
        />
      )}
    </svg>
  );
}

export function StreakCard({ activityDates }: Props) {
  const dateSet = new Set(activityDates);
  const { current, longest } = computeStreaks(dateSet);
  const weekDays = buildWeekView(dateSet);
  const todayKey = formatYmd(new Date());
  const todayDone = dateSet.has(todayKey);
  const message = pickMessage(current, todayDone);
  const streakActive = current > 0;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <FlameIcon
            className={`w-12 h-12 flex-shrink-0 ${streakActive ? 'text-warning' : 'text-text-secondary/40'}`}
            active={streakActive}
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-bold text-text-primary leading-none tabular-nums">
                {current}
              </span>
              <span className="text-sm text-text-secondary">日連続</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">活動の連続記録</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-text-secondary">最長</p>
          <p className="text-lg font-bold text-text-primary tabular-nums leading-none mt-0.5">
            {longest}
            <span className="text-xs text-text-secondary font-normal ml-0.5">日</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-4">
        {weekDays.map((day) => (
          <div key={day.date} className="flex flex-col items-center">
            <span
              className={`text-xs mb-1.5 ${
                day.isToday ? 'text-primary font-bold' : 'text-text-secondary'
              }`}
            >
              {day.label}
            </span>
            <div
              className={`
                w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm transition-colors
                ${day.isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}
                ${
                  day.done
                    ? 'bg-primary text-white'
                    : day.isFuture
                    ? 'bg-background text-text-secondary/40'
                    : 'bg-background text-text-secondary border border-border'
                }
              `}
            >
              {day.done ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span className="tabular-nums">{day.dayOfMonth}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-text-secondary text-center">{message}</p>
    </Card>
  );
}
