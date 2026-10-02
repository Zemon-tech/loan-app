/**
 * Date helpers for IST (Asia/Kolkata) CALENDAR dates (PRD 8.0, 10.1, 12.3).
 *
 * All "today" logic uses IST calendar dates: YYYY-MM-DD strings with no time-of-day.
 * To avoid UTC off-by-one bugs we never do local-timezone Date arithmetic. Internally we
 * anchor every date at UTC midnight (via Date.UTC) purely as a calendar vehicle, so adding
 * days / comparing is deterministic regardless of the machine's timezone.
 *
 * Do NOT use `new Date()` for IST "today" logic anywhere outside this file (PRD 21).
 */

export type IsoDate = string; // 'YYYY-MM-DD'

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30

/** Parse 'YYYY-MM-DD' into its calendar parts. Throws on malformed input. */
export function parseIsoDate(iso: IsoDate): { year: number; month: number; day: number } {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) throw new TypeError(`Invalid ISO date: ${iso}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) throw new RangeError(`Invalid month in ${iso}`);
  if (day < 1 || day > daysInMonth(year, month)) throw new RangeError(`Invalid day in ${iso}`);
  return { year, month, day };
}

/** Number of days in a given month (1-12). Handles leap years. */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of next month = last day of this month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Internal: an IsoDate -> UTC-midnight Date used only as a calendar vehicle. */
function toUtcAnchor(iso: IsoDate): Date {
  const { year, month, day } = parseIsoDate(iso);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Internal: a UTC-anchored Date -> IsoDate. */
function fromUtcAnchor(d: Date): IsoDate {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Add `n` calendar days (can be negative). */
export function addDays(iso: IsoDate, n: number): IsoDate {
  const d = toUtcAnchor(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtcAnchor(d);
}

/**
 * Add `n` calendar months, keeping the same day-of-month but clamping to the target
 * month's last day (PRD 12.3: 31 Jan -> 28/29 Feb -> 31 Mar). `n` can be negative.
 *
 * `anchorDay` lets a monthly schedule preserve the ORIGINAL day-of-month across
 * clamped months (e.g. a 31st schedule returns to the 31st in months that have it),
 * matching the PRD rule "same day-of-month as the first installment".
 */
export function addMonths(iso: IsoDate, n: number, anchorDay?: number): IsoDate {
  const { year, month, day } = parseIsoDate(iso);
  const targetDay = anchorDay ?? day;

  const totalMonthIndex = (year * 12 + (month - 1)) + n;
  const targetYear = Math.floor(totalMonthIndex / 12);
  const targetMonth = (totalMonthIndex % 12) + 1; // 1-12

  const clampedDay = Math.min(targetDay, daysInMonth(targetYear, targetMonth));
  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Day of week for an IST calendar date. 0 = Sunday ... 6 = Saturday
 * (matches PRD 12.2 `weeklyOffWeekday`, Sunday = 0).
 */
export function weekday(iso: IsoDate): number {
  return toUtcAnchor(iso).getUTCDay();
}

/**
 * Compare two ISO dates as calendar dates.
 * Returns < 0 if a < b, 0 if equal, > 0 if a > b.
 */
export function compareIsoDate(a: IsoDate, b: IsoDate): number {
  // ISO 'YYYY-MM-DD' is lexicographically ordered == chronologically ordered.
  return a < b ? -1 : a > b ? 1 : 0;
}

export const isBefore = (a: IsoDate, b: IsoDate): boolean => compareIsoDate(a, b) < 0;
export const isAfter = (a: IsoDate, b: IsoDate): boolean => compareIsoDate(a, b) > 0;
export const isSameDay = (a: IsoDate, b: IsoDate): boolean => compareIsoDate(a, b) === 0;

/** The current date in IST, as an IsoDate. The only sanctioned use of the clock. */
export function todayIST(now: Date = new Date()): IsoDate {
  const istMs = now.getTime() + IST_OFFSET_MS;
  return fromUtcAnchor(new Date(istMs));
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format an ISO date for display as `d MMM yyyy` (PRD 8.0: "15 Jun 2026").
 *   formatDate('2026-06-15') -> "15 Jun 2026"
 */
export function formatDate(iso: IsoDate): string {
  const { year, month, day } = parseIsoDate(iso);
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}
