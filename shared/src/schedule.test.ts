import { describe, it, expect } from 'vitest';

import { computeSchedule } from './schedule.js';
import type { ScheduleInput } from './types/schedule.js';

/**
 * GOLDEN TEST — PRD 12.4. Derived from the real web-app sample (fake identity).
 * Input: firstInstallmentDate=2026-06-16, DAILY, 100 installments, emi=120000 paise,
 * no weekly off, totalInstallmentPaidPaise=3900000, asOfDate=2026-09-19.
 */
describe('computeSchedule — golden test (PRD 12.4)', () => {
  const input: ScheduleInput = {
    firstInstallmentDate: '2026-06-16',
    payFrequency: 'DAILY',
    totalInstallments: 100,
    emiAmountPaise: 120000,
    totalInstallmentPaidPaise: 3900000,
    asOfDate: '2026-09-19',
  };
  const r = computeSchedule(input);
  const byNumber = (n: number) => r.items.find((i) => i.number === n)!;

  it('installment #1 is due 2026-06-16', () => {
    expect(byNumber(1).dueDate).toBe('2026-06-16');
  });

  it('installment #100 is due 2026-09-23 (= maturity date)', () => {
    expect(byNumber(100).dueDate).toBe('2026-09-23');
    expect(r.maturityDate).toBe('2026-09-23');
  });

  it('installments #1..#32 are PAID', () => {
    for (let n = 1; n <= 32; n += 1) {
      expect(byNumber(n).status, `#${n}`).toBe('PAID');
    }
  });

  it('installment #33 (due 2026-07-18) is PARTIAL, paidPaise=60000, isOverdue=true', () => {
    const i33 = byNumber(33);
    expect(i33.dueDate).toBe('2026-07-18');
    expect(i33.status).toBe('PARTIAL');
    expect(i33.paidPaise).toBe(60000);
    expect(i33.isOverdue).toBe(true);
  });

  it('installmentsPaid=32, installmentsRemaining=68', () => {
    expect(r.installmentsPaid).toBe(32);
    expect(r.installmentsRemaining).toBe(68);
  });

  it('installments #34..#95 are OVERDUE (#95 due 2026-09-18)', () => {
    for (let n = 34; n <= 95; n += 1) {
      expect(byNumber(n).status, `#${n}`).toBe('OVERDUE');
    }
    expect(byNumber(95).dueDate).toBe('2026-09-18');
  });

  it('installment #96 (due 2026-09-19) is DUE_TODAY', () => {
    expect(byNumber(96).dueDate).toBe('2026-09-19');
    expect(byNumber(96).status).toBe('DUE_TODAY');
  });

  it('installments #97..#100 are UPCOMING', () => {
    for (let n = 97; n <= 100; n += 1) {
      expect(byNumber(n).status, `#${n}`).toBe('UPCOMING');
    }
  });

  it('overdueInstallmentsPaise = 95*120000 - 3900000 = 7500000', () => {
    expect(r.overdueInstallmentsPaise).toBe(7500000);
  });

  it('overdueInstallmentsCount = 63', () => {
    expect(r.overdueInstallmentsCount).toBe(63);
  });

  it('nextDue = { date: 2026-09-19, amountPaise: 120000, isToday: true }', () => {
    expect(r.nextDue).toEqual({ date: '2026-09-19', amountPaise: 120000, isToday: true });
  });

  it('status is OVERDUE', () => {
    expect(r.status).toBe('OVERDUE');
  });
});

describe('computeSchedule — monthly month-end clamping', () => {
  it('clamps a 31 Jan start across short months and returns to 31 where possible', () => {
    const r = computeSchedule({
      firstInstallmentDate: '2026-01-31',
      payFrequency: 'MONTHLY',
      totalInstallments: 4,
      emiAmountPaise: 100000,
      totalInstallmentPaidPaise: 0,
      asOfDate: '2026-01-31',
    });
    expect(r.items.map((i) => i.dueDate)).toEqual([
      '2026-01-31',
      '2026-02-28', // 2026 not a leap year
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('clamps to 29 Feb in a leap year', () => {
    const r = computeSchedule({
      firstInstallmentDate: '2024-01-31',
      payFrequency: 'MONTHLY',
      totalInstallments: 2,
      emiAmountPaise: 100000,
      totalInstallmentPaidPaise: 0,
      asOfDate: '2024-01-31',
    });
    expect(r.items[1]!.dueDate).toBe('2024-02-29');
  });
});

describe('computeSchedule — weekly & fortnightly', () => {
  it('WEEKLY adds 7 days per installment', () => {
    const r = computeSchedule({
      firstInstallmentDate: '2026-06-01',
      payFrequency: 'WEEKLY',
      totalInstallments: 3,
      emiAmountPaise: 100000,
      totalInstallmentPaidPaise: 0,
      asOfDate: '2026-06-01',
    });
    expect(r.items.map((i) => i.dueDate)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
  });

  it('FORTNIGHTLY adds 14 days per installment', () => {
    const r = computeSchedule({
      firstInstallmentDate: '2026-06-01',
      payFrequency: 'FORTNIGHTLY',
      totalInstallments: 3,
      emiAmountPaise: 100000,
      totalInstallmentPaidPaise: 0,
      asOfDate: '2026-06-01',
    });
    expect(r.items.map((i) => i.dueDate)).toEqual(['2026-06-01', '2026-06-15', '2026-06-29']);
  });
});

describe('computeSchedule — DAILY weekly-off skipping', () => {
  it('skips the weekly-off weekday when placing daily installments', () => {
    // 2026-06-01 is a Monday. Weekly off = Sunday (0). Installment #7 should skip Sun 2026-06-07.
    const r = computeSchedule({
      firstInstallmentDate: '2026-06-01',
      payFrequency: 'DAILY',
      totalInstallments: 8,
      emiAmountPaise: 100000,
      totalInstallmentPaidPaise: 0,
      asOfDate: '2026-06-01',
      weeklyOffWeekday: 0,
    });
    const dates = r.items.map((i) => i.dueDate);
    expect(dates).toContain('2026-06-06'); // Saturday included
    expect(dates).not.toContain('2026-06-07'); // Sunday skipped
    expect(dates).toContain('2026-06-08'); // Monday after the skip
  });
});

describe('computeSchedule — payment edge cases', () => {
  const base: ScheduleInput = {
    firstInstallmentDate: '2026-06-01',
    payFrequency: 'DAILY',
    totalInstallments: 5,
    emiAmountPaise: 100000,
    totalInstallmentPaidPaise: 0,
    asOfDate: '2026-06-10', // all 5 due dates are in the past
  };

  it('zero payments: all past installments OVERDUE, status OVERDUE', () => {
    const r = computeSchedule(base);
    expect(r.installmentsPaid).toBe(0);
    expect(r.summary.overdue).toBe(5);
    expect(r.overdueInstallmentsPaise).toBe(500000);
    expect(r.overdueInstallmentsCount).toBe(5);
    expect(r.status).toBe('OVERDUE');
  });

  it('fully paid: all PAID, nextDue null, status CLOSED', () => {
    const r = computeSchedule({ ...base, totalInstallmentPaidPaise: 500000 });
    expect(r.installmentsPaid).toBe(5);
    expect(r.installmentsRemaining).toBe(0);
    expect(r.nextDue).toBeNull();
    expect(r.overdueInstallmentsPaise).toBe(0);
    expect(r.status).toBe('CLOSED');
  });

  it('overpayment beyond the schedule is ignored (no negative remainders)', () => {
    const r = computeSchedule({ ...base, totalInstallmentPaidPaise: 999999999 });
    expect(r.installmentsPaid).toBe(5);
    expect(r.items.every((i) => i.paidPaise === i.amountPaise)).toBe(true);
    expect(r.overdueInstallmentsPaise).toBe(0);
    expect(r.status).toBe('CLOSED');
  });

  it('final installment override applies to the last installment only', () => {
    const r = computeSchedule({
      ...base,
      emiAmountPaise: 100000,
      finalInstallmentAmountPaise: 50000,
      totalInstallments: 5,
    });
    expect(r.items[4]!.amountPaise).toBe(50000);
    expect(r.items[0]!.amountPaise).toBe(100000);
  });

  it('dbClosed forces CLOSED even with an outstanding balance', () => {
    const r = computeSchedule({ ...base, dbClosed: true });
    expect(r.status).toBe('CLOSED');
  });
});
