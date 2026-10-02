/**
 * Domain types for the repayment schedule (subset of PRD 10.3 relevant to computation).
 */
import type { Paise } from '../money.js';
import type { IsoDate } from '../dates.js';

export type PayFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'CLOSED';

export interface Installment {
  /** 1-based installment number. */
  number: number;
  dueDate: IsoDate;
  amountPaise: Paise;
  paidPaise: Paise;
  status: InstallmentStatus;
  /** true for an OVERDUE installment, and for a PARTIAL one whose dueDate < today. */
  isOverdue: boolean;
  /** Present (best-effort) when the installment is fully paid. */
  paidOn?: IsoDate;
}

/** Inputs for the computed schedule (PRD 12.2). */
export interface ScheduleInput {
  firstInstallmentDate: IsoDate;
  payFrequency: PayFrequency;
  totalInstallments: number;
  emiAmountPaise: Paise;
  /** The DB's "Installment paid"/credited total, allocated FIFO across installments. */
  totalInstallmentPaidPaise: Paise;
  /** Today in IST. */
  asOfDate: IsoDate;
  /** Optional: last installment may differ from the regular EMI. */
  finalInstallmentAmountPaise?: Paise;
  /** Optional per-loan weekly-off weekday (0 = Sunday ... 6 = Saturday). DAILY only. */
  weeklyOffWeekday?: number;
  /** Optional DB-provided maturity date; falls back to the last installment's due date. */
  maturityDate?: IsoDate | null;
  /** Optional: force CLOSED (e.g. DB says closed) regardless of computed outstanding. */
  dbClosed?: boolean;
}

export interface NextDue {
  date: IsoDate;
  amountPaise: Paise;
  isToday: boolean;
}

export interface ScheduleSummary {
  total: number;
  paid: number;
  partial: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
}

export interface ScheduleResult {
  items: Installment[];
  summary: ScheduleSummary;
  /** Count of installments fully PAID. */
  installmentsPaid: number;
  /** totalInstallments - installmentsPaid. */
  installmentsRemaining: number;
  /** Sum of (amount - paid) for installments with dueDate < today. */
  overdueInstallmentsPaise: Paise;
  /** How many past-due installments still have a remainder. */
  overdueInstallmentsCount: number;
  /** Earliest installment with a remainder and dueDate >= today; null if none. */
  nextDue: NextDue | null;
  /** DB maturity date if provided, else the last installment's due date. */
  maturityDate: IsoDate | null;
  /** Derived loan status (does not override a DB "closed" flag — see dbClosed). */
  status: LoanStatus;
}
