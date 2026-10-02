/**
 * Repayment schedule calculator — PURE functions (PRD Section 12).
 *
 * Principle: when the client DB has an installment table, a DbScheduleProvider maps it;
 * otherwise this computes the schedule. Charges (late fee, overdue interest, recovery) are
 * ALWAYS read from the DB, never calculated here (PRD Q7).
 *
 * All money is integer paise; all date math is IST calendar dates (see ./dates).
 */

import { addDays, addMonths, compareIsoDate, parseIsoDate, weekday, type IsoDate } from './dates.js';
import type { Paise } from './money.js';
import type {
  Installment,
  LoanStatus,
  NextDue,
  ScheduleInput,
  ScheduleResult,
  ScheduleSummary,
} from './types/schedule.js';

/**
 * Compute the due date of installment `index` (0-based) given the first installment date
 * and frequency. DAILY may skip a weekly-off weekday (PRD 12.3 step 1).
 */
function dueDateForIndex(
  index: number,
  firstInstallmentDate: IsoDate,
  frequency: ScheduleInput['payFrequency'],
  weeklyOffWeekday: number | undefined,
  anchorDay: number,
): IsoDate {
  if (index === 0) return firstInstallmentDate;

  switch (frequency) {
    case 'DAILY': {
      // Advance one calendar day per installment, skipping the weekly-off weekday.
      let date = firstInstallmentDate;
      let placed = 0;
      while (placed < index) {
        date = addDays(date, 1);
        if (weeklyOffWeekday === undefined || weekday(date) !== weeklyOffWeekday) {
          placed += 1;
        }
      }
      return date;
    }
    case 'WEEKLY':
      return addDays(firstInstallmentDate, 7 * index);
    case 'FORTNIGHTLY':
      return addDays(firstInstallmentDate, 14 * index);
    case 'MONTHLY':
      // Same day-of-month as the first installment, clamped to month-end.
      return addMonths(firstInstallmentDate, index, anchorDay);
    default: {
      const exhaustive: never = frequency;
      throw new Error(`Unsupported pay frequency: ${String(exhaustive)}`);
    }
  }
}

/**
 * Compute the full schedule and derived summary for a loan (PRD 12.3).
 */
export function computeSchedule(input: ScheduleInput): ScheduleResult {
  const {
    firstInstallmentDate,
    payFrequency,
    totalInstallments,
    emiAmountPaise,
    totalInstallmentPaidPaise,
    asOfDate,
    finalInstallmentAmountPaise,
    weeklyOffWeekday,
    maturityDate,
    dbClosed,
  } = input;

  if (!Number.isInteger(totalInstallments) || totalInstallments < 0) {
    throw new RangeError(`totalInstallments must be a non-negative integer, got ${totalInstallments}`);
  }

  const anchorDay = parseIsoDate(firstInstallmentDate).day;

  // --- Step 1 & 2: build each installment's due date and amount. ---
  const items: Installment[] = [];
  for (let i = 0; i < totalInstallments; i += 1) {
    const isLast = i === totalInstallments - 1;
    const amountPaise =
      isLast && finalInstallmentAmountPaise !== undefined
        ? finalInstallmentAmountPaise
        : emiAmountPaise;

    items.push({
      number: i + 1,
      dueDate: dueDateForIndex(i, firstInstallmentDate, payFrequency, weeklyOffWeekday, anchorDay),
      amountPaise,
      paidPaise: 0,
      status: 'UPCOMING',
      isOverdue: false,
    });
  }

  // --- Step 3: FIFO allocation of the paid total, oldest installment first. ---
  let remaining = Math.max(0, totalInstallmentPaidPaise);
  for (const item of items) {
    if (remaining <= 0) break;
    const applied = Math.min(item.amountPaise, remaining);
    item.paidPaise = applied;
    remaining -= applied;
    // Overpayment beyond the schedule is ignored (PRD 12.4 extras).
  }

  // --- Step 4: status per installment. ---
  for (const item of items) {
    const cmp = compareIsoDate(item.dueDate, asOfDate); // <0 past, 0 today, >0 future
    if (item.paidPaise >= item.amountPaise && item.amountPaise > 0) {
      item.status = 'PAID';
      item.isOverdue = false;
    } else if (item.paidPaise > 0 && item.paidPaise < item.amountPaise) {
      item.status = 'PARTIAL';
      item.isOverdue = cmp < 0;
    } else if (cmp < 0) {
      item.status = 'OVERDUE';
      item.isOverdue = true;
    } else if (cmp === 0) {
      item.status = 'DUE_TODAY';
      item.isOverdue = false;
    } else {
      item.status = 'UPCOMING';
      item.isOverdue = false;
    }
  }

  // --- Step 5: derived summary. ---
  const summary: ScheduleSummary = {
    total: items.length,
    paid: 0,
    partial: 0,
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
  };
  for (const item of items) {
    switch (item.status) {
      case 'PAID':
        summary.paid += 1;
        break;
      case 'PARTIAL':
        summary.partial += 1;
        break;
      case 'OVERDUE':
        summary.overdue += 1;
        break;
      case 'DUE_TODAY':
        summary.dueToday += 1;
        break;
      case 'UPCOMING':
        summary.upcoming += 1;
        break;
    }
  }

  const installmentsPaid = summary.paid;
  const installmentsRemaining = totalInstallments - installmentsPaid;

  // Overdue amount/count: installments whose dueDate < today with a remainder.
  let overdueInstallmentsPaise: Paise = 0;
  let overdueInstallmentsCount = 0;
  for (const item of items) {
    if (compareIsoDate(item.dueDate, asOfDate) < 0) {
      const rem = item.amountPaise - item.paidPaise;
      if (rem > 0) {
        overdueInstallmentsPaise += rem;
        overdueInstallmentsCount += 1;
      }
    }
  }

  // nextDue: earliest installment with remainder > 0 and dueDate >= today.
  let nextDue: NextDue | null = null;
  for (const item of items) {
    const cmp = compareIsoDate(item.dueDate, asOfDate);
    const rem = item.amountPaise - item.paidPaise;
    if (cmp >= 0 && rem > 0) {
      nextDue = { date: item.dueDate, amountPaise: rem, isToday: cmp === 0 };
      break;
    }
  }

  // maturityDate: DB value if provided, else last installment's due date.
  const lastItem = items[items.length - 1];
  const resolvedMaturity: IsoDate | null =
    maturityDate ?? (lastItem ? lastItem.dueDate : null);

  // Loan status: CLOSED if nothing remains (or DB says closed); OVERDUE if any overdue; else ACTIVE.
  const totalRemaining = items.reduce((acc, i) => acc + (i.amountPaise - i.paidPaise), 0);
  let status: LoanStatus;
  if (dbClosed || totalRemaining <= 0) {
    status = 'CLOSED';
  } else if (overdueInstallmentsPaise > 0) {
    status = 'OVERDUE';
  } else {
    status = 'ACTIVE';
  }

  return {
    items,
    summary,
    installmentsPaid,
    installmentsRemaining,
    overdueInstallmentsPaise,
    overdueInstallmentsCount,
    nextDue,
    maturityDate: resolvedMaturity,
    status,
  };
}
