const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // midday avoids DST edge cases
}

export function todayKey(): string {
  return toKey(new Date());
}

export function isValidKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toKey(fromKey(key)) === key;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, opts);
const weekdayF = fmt({ weekday: 'long' });
const monthDayF = fmt({ month: 'long', day: 'numeric' });
const fullF = fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const monthF = fmt({ month: 'long' });
const monthYearF = fmt({ month: 'long', year: 'numeric' });
const shortMonthF = fmt({ month: 'short' });
const narrowWeekdayF = fmt({ weekday: 'narrow' });

export const formatWeekday = (key: string) => weekdayF.format(fromKey(key));
export const formatMonthDay = (key: string) => monthDayF.format(fromKey(key));
export const formatFull = (key: string) => fullF.format(fromKey(key));
export const formatMonth = (y: number, m: number) => monthF.format(new Date(y, m, 1, 12));
export const formatMonthYear = (y: number, m: number) => monthYearF.format(new Date(y, m, 1, 12));
export const formatShortMonth = (y: number, m: number) => shortMonthF.format(new Date(y, m, 1, 12));
export const yearOf = (key: string) => Number(key.slice(0, 4));

/** Narrow weekday labels starting at weekStart (0 = Sunday). */
export function weekdayLabels(weekStart: 0 | 1): string[] {
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => narrowWeekdayF.format(new Date(2023, 0, 1 + ((i + weekStart) % 7), 12)));
}

export interface MonthCell {
  key: string;
  day: number;
  inMonth: boolean;
}

/** A 6×7 grid for the given month. */
export function monthGrid(year: number, month: number, weekStart: 0 | 1): MonthCell[] {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(year, month, 1 - offset, 12);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12);
    return { key: toKey(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

/** Human phrase for how long ago a past year was, relative to the current year. */
export function yearsAgoPhrase(years: number): string {
  if (years === 1) return 'One year ago today';
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  return `${words[years] ?? years} years ago today`;
}
