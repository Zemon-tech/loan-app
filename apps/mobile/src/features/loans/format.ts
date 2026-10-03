/**
 * Display helpers for money and dates.
 * TODO: replace with formatINR / date helpers from @app/shared once the mobile app
 * consumes the workspace package (whole rupees, Indian grouping, IST dates).
 */
import { MOCK_TODAY } from './clock';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** 120000 -> "₹1,20,000" (Indian digit grouping, whole rupees). */
export function formatINR(value: number): string {
  const abs = String(Math.abs(Math.round(value)));
  const grouped =
    abs.length <= 3 ? abs : `${abs.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${abs.slice(-3)}`;
  return `${value < 0 ? '\u2212' : ''}\u20B9${grouped}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "19 Sep 2026" */
export function formatDate(d: Date): string {
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]!.slice(0, 3)} ${d.getFullYear()}`;
}

/** "11 Sep" */
export function formatDayMonth(d: Date): string {
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]!.slice(0, 3)}`;
}

/** "September 2026" */
export function formatMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Sortable month identifier. */
export function monthKey(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole days from b to a (a - b). */
export function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(a) - startOfDay(b)) / 86_400_000);
}

/** "Due today" / "Due tomorrow" / "Due in 5 days" / "Due 05 Oct 2026". */
export function dueLabel(date: Date, today: Date = MOCK_TODAY): string {
  const diff = dayDiff(date, today);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff > 1 && diff <= 14) return `Due in ${diff} days`;
  return `Due ${formatDate(date)}`;
}
