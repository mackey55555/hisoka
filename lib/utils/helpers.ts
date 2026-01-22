import { format, parseISO } from 'date-fns';

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy年MM月dd日');
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy年MM月dd日 HH:mm');
}

export function isDeadlineNear(deadline: string): boolean {
  const deadlineDate = parseISO(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays >= 0;
}

export function isDeadlinePassed(deadline: string): boolean {
  const deadlineDate = parseISO(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

