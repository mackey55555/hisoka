import { format, parseISO } from 'date-fns';

function toDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return parseISO(date);
}

export function formatDate(date: string | Date): string {
  return format(toDate(date), 'yyyy年MM月dd日');
}

export function formatDateTime(date: string | Date): string {
  return format(toDate(date), 'yyyy年MM月dd日 HH:mm');
}

export function formatMonthKey(date: string | Date): string {
  return format(toDate(date), 'yyyy-MM');
}

export function formatMonthLabel(date: string | Date): string {
  return format(toDate(date), 'yyyy年M月');
}

export function daysUntilDeadline(deadline: string): number {
  const deadlineDate = toDate(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((deadlineDate.getTime() - today.getTime()) / 86400000);
}

export function isDeadlineNear(deadline: string): boolean {
  const diff = daysUntilDeadline(deadline);
  return diff <= 7 && diff >= 0;
}

export function isDeadlinePassed(deadline: string): boolean {
  return daysUntilDeadline(deadline) < 0;
}

