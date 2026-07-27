const DAY_MS = 24 * 60 * 60 * 1000;

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return new Date(NaN);
  return new Date(year, month - 1, day);
}

export function isValidLocalDateString(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const parsed = parseLocalDate(dateString);
  return !Number.isNaN(parsed.getTime()) && toLocalDateString(parsed) === dateString;
}

export function calendarDaysFromToday(dateString: string, today: Date = new Date()): number {
  const target = parseLocalDate(dateString);
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;

  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetDay - currentDay) / DAY_MS);
}
