import { describe, it, expect } from 'vitest';

import {
  addDays,
  addMonths,
  compareIsoDate,
  daysInMonth,
  formatDate,
  isLeapYear,
  parseIsoDate,
  todayIST,
  weekday,
} from './dates.js';

describe('parseIsoDate', () => {
  it('parses a valid ISO date', () => {
    expect(parseIsoDate('2026-06-16')).toEqual({ year: 2026, month: 6, day: 16 });
  });

  it('rejects malformed or out-of-range dates', () => {
    expect(() => parseIsoDate('2026-6-16')).toThrow();
    expect(() => parseIsoDate('2026-13-01')).toThrow();
    expect(() => parseIsoDate('2026-02-30')).toThrow();
  });
});

describe('addDays (no UTC off-by-one)', () => {
  it('adds and subtracts calendar days, crossing month and year boundaries', () => {
    expect(addDays('2026-06-16', 1)).toBe('2026-06-17');
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('matches the golden schedule span: 99 days from 2026-06-16 is 2026-09-23', () => {
    expect(addDays('2026-06-16', 99)).toBe('2026-09-23');
  });
});

describe('addMonths (month-end clamping)', () => {
  it('clamps the day to the target month length', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29'); // leap year
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31');
  });

  it('uses anchorDay to return to the original day where the month allows', () => {
    // Anchor on the 31st: Feb clamps to 28, March returns to 31.
    expect(addMonths('2026-01-31', 1, 31)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 2, 31)).toBe('2026-03-31');
  });
});

describe('weekday (Sunday = 0)', () => {
  it('returns the correct weekday', () => {
    expect(weekday('2026-06-07')).toBe(0); // Sunday
    expect(weekday('2026-06-01')).toBe(1); // Monday
  });
});

describe('calendar helpers', () => {
  it('daysInMonth and isLeapYear', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it('compareIsoDate orders chronologically', () => {
    expect(compareIsoDate('2026-06-16', '2026-09-19')).toBeLessThan(0);
    expect(compareIsoDate('2026-09-19', '2026-09-19')).toBe(0);
    expect(compareIsoDate('2026-09-20', '2026-09-19')).toBeGreaterThan(0);
  });
});

describe('todayIST', () => {
  it('returns the IST calendar date, not the UTC one, near midnight', () => {
    // 2026-06-15T20:00:00Z is 2026-06-16 01:30 IST -> IST date is the 16th.
    const utcLateEvening = new Date('2026-06-15T20:00:00Z');
    expect(todayIST(utcLateEvening)).toBe('2026-06-16');
  });
});

describe('formatDate', () => {
  it("formats as 'd MMM yyyy'", () => {
    expect(formatDate('2026-06-15')).toBe('15 Jun 2026');
    expect(formatDate('2026-09-19')).toBe('19 Sep 2026');
  });
});
