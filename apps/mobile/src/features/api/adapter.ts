/**
 * Adapter boundary — the SINGLE place money and dates cross from wire to domain.
 *
 * Pure functions, no React / no SecureStore, so they are unit-testable. Money crosses exactly
 * once via @app/shared rupeesToPaise/assertPaise (no parseFloat/toFixed anywhere). Dates cross
 * via @app/shared isoDateTimeToIstDate. `loanRef` -> `loanId` verbatim/opaque. Status and
 * payment frequency are normalized with explicit case-insensitive maps + a safe fallback.
 */
import {
  assertPaise,
  isoDateTimeToIstDate,
  rupeesToPaise,
  type LoanStatus,
  type Paise,
  type PayFrequency,
} from '@app/shared';

import { AdapterError } from './errors';
import type { LoanDetailWire, LoanWire } from './wireTypes';
import type { LoanDetailVM, LoanListItemVM, LoansSummaryVM } from './vm';

const STATUS_MAP: Record<string, LoanStatus> = {
  active: 'ACTIVE',
  overdue: 'OVERDUE',
  closed: 'CLOSED',
};

/**
 * Normalize the wire status to the uppercase domain enum. Explicit case-insensitive map with a
 * safe `ACTIVE` fallback (unknown vocabulary never crashes — D-STATUS), then the overdue-amount
 * override: a positive overdue balance presents as OVERDUE regardless of label, unless CLOSED.
 */
export function toLoanStatus(wire: string, overduePaise: Paise): LoanStatus {
  const base = STATUS_MAP[typeof wire === 'string' ? wire.toLowerCase() : ''] ?? 'ACTIVE';
  return overduePaise > 0 && base !== 'CLOSED' ? 'OVERDUE' : base;
}

const FREQUENCY_MAP: Record<string, PayFrequency> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  fortnightly: 'FORTNIGHTLY',
  monthly: 'MONTHLY',
};

/** Normalize a wire payment-frequency label; unknown -> null (renders a neutral dash). */
export function toPayFrequency(wire: string | null | undefined): PayFrequency | null {
  if (typeof wire !== 'string') return null;
  return FREQUENCY_MAP[wire.toLowerCase()] ?? null;
}

/** Convert a rupee-decimal wire amount to integer paise, throwing AdapterError (kind only). */
function moneyPaise(value: unknown, field: string): Paise {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AdapterError(`invalid-amount:${field}`);
  }
  try {
    return assertPaise(rupeesToPaise(value), field);
  } catch {
    throw new AdapterError(`invalid-amount:${field}`);
  }
}

/** Convert a wire ISO datetime to an IST calendar date; null on empty/invalid (not thrown). */
function dateOrNull(value: unknown, field: string): import('@app/shared').IsoDate | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new AdapterError(`invalid-date:${field}`);
  try {
    return isoDateTimeToIstDate(value);
  } catch {
    throw new AdapterError(`invalid-date:${field}`);
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AdapterError(`missing-field:${field}`);
  }
  return value;
}

export function toLoanListItemVM(wire: LoanWire): LoanListItemVM {
  const loanId = requireString(wire?.loanRef, 'loanRef'); // opaque, verbatim
  const accountNumber = requireString(wire?.accountNumber, 'accountNumber');
  const overdueAmountPaise = moneyPaise(wire?.overdueAmount, 'overdueAmount');
  return {
    loanId,
    accountNumber,
    status: toLoanStatus(wire?.status, overdueAmountPaise),
    isOverdue: overdueAmountPaise > 0,
    emiAmountPaise: moneyPaise(wire?.installmentAmount, 'installmentAmount'),
    outstandingPaise: moneyPaise(wire?.outstandingAmount, 'outstandingAmount'),
    overdueAmountPaise,
  };
}

export function toLoanDetailVM(wire: LoanDetailWire): LoanDetailVM {
  const base = toLoanListItemVM(wire);
  return {
    ...base,
    loanDate: dateOrNull(wire?.startDate, 'startDate'),
    maturityDate: dateOrNull(wire?.maturityDate, 'maturityDate'),
    payFrequency: toPayFrequency(wire?.paymentFrequency),
    principalPaise: moneyPaise(wire?.financedAmount, 'financedAmount'),
    totalPaidPaise: moneyPaise(wire?.totalPaid, 'totalPaid'),
  };
}

/**
 * Build the home summary over the list VMs: sum paise, count overdue loans, sort active loans
 * overdue-first then by accountNumber. No nextDue (no wire source).
 */
export function buildLoansSummary(items: LoanListItemVM[]): LoansSummaryVM {
  const activeLoans = items
    .filter((l) => l.status !== 'CLOSED')
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return a.accountNumber.localeCompare(b.accountNumber);
    });
  const closedLoans = items.filter((l) => l.status === 'CLOSED');

  return {
    activeLoans,
    closedLoans,
    totalOutstandingPaise: activeLoans.reduce((s, l) => s + l.outstandingPaise, 0),
    overdueTotalPaise: activeLoans.reduce((s, l) => s + l.overdueAmountPaise, 0),
    overdueLoanCount: activeLoans.filter((l) => l.isOverdue).length,
  };
}
