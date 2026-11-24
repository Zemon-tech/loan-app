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
import type {
  DisbursalWire,
  DuesWire,
  LoanDetailWire,
  LoanWire,
  SettlementWire,
  TransactionItemWire,
  TransactionsResponseWire,
  UserProfileWire,
} from './wireTypes';
import type {
  BorrowerProfileVM,
  LoanDetailVM,
  LoanDisbursalVM,
  LoanDuesVM,
  LoanListItemVM,
  LoanSettlementVM,
  LoansSummaryVM,
  TransactionVM,
  TransactionsPageVM,
} from './vm';

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

export function toBorrowerProfileVM(wire: UserProfileWire): BorrowerProfileVM {
  const name =
    typeof (wire as any)?.fullName === 'string'
      ? (wire as any).fullName.trim()
      : typeof wire?.name === 'string'
        ? wire.name.trim()
        : 'Customer';
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  const initials = parts.length >= 2 && first && last
    ? `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    : (first.charAt(0) || 'C').toUpperCase();

  const phone = (wire as any)?.mobile ?? (wire as any)?.phone ?? null;

  return {
    name: name || 'Customer',
    hasPhoto: Boolean(wire?.hasPhoto),
    initials,
    phone,
  };
}

export function toLoanDisbursalVM(wire: DisbursalWire | null | undefined): LoanDisbursalVM | null {
  if (!wire) return null;
  return {
    loanAmountPaise: moneyPaise(wire.loanAmount, 'disbursal.loanAmount'),
    serviceChargesPaise: moneyPaise(wire.serviceCharges, 'disbursal.serviceCharges'),
    verificationChargesPaise: moneyPaise(wire.verificationCharges, 'disbursal.verificationCharges'),
    advanceInstallmentPaise: moneyPaise(wire.advanceInstallment, 'disbursal.advanceInstallment'),
    previousLoanAdjustmentPaise: moneyPaise(wire.previousLoanAdjustment, 'disbursal.previousLoanAdjustment'),
    totalDeductionsPaise: moneyPaise(wire.totalDeductions, 'disbursal.totalDeductions'),
    amountDisbursedPaise: moneyPaise(wire.amountDisbursed, 'disbursal.amountDisbursed'),
  };
}

export function toLoanDuesVM(wire: DuesWire | null | undefined): LoanDuesVM | null {
  if (!wire) return null;
  return {
    installmentsDuePaise: moneyPaise(wire.installmentsDue, 'dues.installmentsDue'),
    lateFeesPaise: moneyPaise(wire.lateFees, 'dues.lateFees'),
    overdueInterestPaise: moneyPaise(wire.overdueInterest, 'dues.overdueInterest'),
    recoveryVisitChargesPaise: moneyPaise(wire.recoveryVisitCharges, 'dues.recoveryVisitCharges'),
    discountPaise: moneyPaise(wire.discount, 'dues.discount'),
    totalDuePaise: moneyPaise(wire.totalDue, 'dues.totalDue'),
    installmentPaymentsPaise: moneyPaise(wire.installmentPayments, 'dues.installmentPayments'),
    advanceInstallmentPaise: moneyPaise(wire.advanceInstallment, 'dues.advanceInstallment'),
    adjustmentsPaise: moneyPaise(wire.adjustments, 'dues.adjustments'),
    totalPaidPaise: moneyPaise(wire.totalPaid, 'dues.totalPaid'),
    overdueAmountPaise: moneyPaise(wire.overdueAmount, 'dues.overdueAmount'),
  };
}

export function toLoanSettlementVM(wire: SettlementWire | null | undefined): LoanSettlementVM | null {
  if (!wire) return null;
  return {
    settlementDate: dateOrNull(wire.settlementDate, 'settlement.settlementDate'),
    settlementAmountPaise: moneyPaise(wire.settlementAmount, 'settlement.settlementAmount'),
    paymentFrequency: toPayFrequency(wire.paymentFrequency),
    installmentAmountPaise:
      wire.installmentAmount != null ? moneyPaise(wire.installmentAmount, 'settlement.installmentAmount') : null,
    paidSinceSettlementPaise: moneyPaise(wire.paidSinceSettlement, 'settlement.paidSinceSettlement'),
    balancePaise: moneyPaise(wire.balance, 'settlement.balance'),
  };
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
    startDate: dateOrNull(wire?.startDate, 'startDate'),
    loanDate: dateOrNull(wire?.loanDate ?? wire?.startDate, 'loanDate'),
    maturityDate: dateOrNull(wire?.maturityDate, 'maturityDate'),
    payFrequency: toPayFrequency(wire?.paymentFrequency),
    principalPaise: moneyPaise(wire?.financedAmount, 'financedAmount'),
    totalPaidPaise: moneyPaise(wire?.totalPaid, 'totalPaid'),
    numberOfInstallments: typeof wire?.numberOfInstallments === 'number' ? wire.numberOfInstallments : null,
    weeklyOff: typeof wire?.weeklyOff === 'string' ? wire.weeklyOff : null,
    nextCollectionDate: dateOrNull(wire?.nextCollectionDate, 'nextCollectionDate'),
    installmentsOverdue: typeof wire?.installmentsOverdue === 'number' ? wire.installmentsOverdue : null,
    lastPayment: wire?.lastPayment
      ? {
          amountPaise: moneyPaise(wire.lastPayment.amount, 'lastPayment.amount'),
          date: dateOrNull(wire.lastPayment.date, 'lastPayment.date'),
        }
      : null,
    disbursal: toLoanDisbursalVM(wire?.disbursal),
    dues: toLoanDuesVM(wire?.dues),
    settlement: toLoanSettlementVM(wire?.settlement),
  };
}

export function toTransactionVM(wire: TransactionItemWire): TransactionVM {
  return {
    date: dateOrNull(wire?.date, 'transaction.date'),
    rawDate: wire?.date ?? '',
    type: typeof wire?.type === 'string' ? wire.type : 'other',
    description: typeof wire?.description === 'string' && wire.description ? wire.description : 'Transaction',
    direction: wire?.direction === 'debit' ? 'debit' : 'credit',
    amountPaise: moneyPaise(wire?.amount, 'transaction.amount'),
    paymentMode: typeof wire?.paymentMode === 'string' ? wire.paymentMode : null,
    channel: typeof wire?.channel === 'string' ? wire.channel : null,
  };
}

export function toTransactionsPageVM(wire: TransactionsResponseWire): TransactionsPageVM {
  return {
    page: typeof wire?.page === 'number' ? wire.page : 1,
    pageSize: typeof wire?.pageSize === 'number' ? wire.pageSize : 50,
    totalCount: typeof wire?.totalCount === 'number' ? wire.totalCount : 0,
    totalPages: typeof wire?.totalPages === 'number' ? wire.totalPages : 1,
    totalCreditPaise: moneyPaise(wire?.totalCredit ?? 0, 'totalCredit'),
    totalDebitPaise: moneyPaise(wire?.totalDebit ?? 0, 'totalDebit'),
    transactions: Array.isArray(wire?.transactions) ? wire.transactions.map(toTransactionVM) : [],
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
