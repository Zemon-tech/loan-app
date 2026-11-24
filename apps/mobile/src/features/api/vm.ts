/**
 * View models — the shape BOTH the live adapter and the mock adapter produce, built from
 * @app/shared SCALAR domain types (integer paise, IST `YYYY-MM-DD`, uppercase LoanStatus).
 * The two live screens (loans list + loan detail) consume one shape in both modes.
 *
 * `QueryState<T>` (the four prototype states) lives here so the TanStack live hooks and the
 * retained mock path (features/system/mockQuery.ts) share one definition.
 */
import type { IsoDate, LoanStatus, Paise, PayFrequency } from '@app/shared';

export interface BorrowerProfileVM {
  name: string;
  hasPhoto: boolean;
  initials: string;
  phone?: string | null;
}

export interface LastPaymentVM {
  amountPaise: Paise;
  date: IsoDate | null;
}

export interface LoanDisbursalVM {
  loanAmountPaise: Paise;
  serviceChargesPaise: Paise;
  verificationChargesPaise: Paise;
  advanceInstallmentPaise: Paise;
  previousLoanAdjustmentPaise: Paise;
  totalDeductionsPaise: Paise;
  amountDisbursedPaise: Paise;
}

export interface LoanDuesVM {
  installmentsDuePaise: Paise;
  lateFeesPaise: Paise;
  overdueInterestPaise: Paise;
  recoveryVisitChargesPaise: Paise;
  discountPaise: Paise;
  totalDuePaise: Paise;
  installmentPaymentsPaise: Paise;
  advanceInstallmentPaise: Paise;
  adjustmentsPaise: Paise;
  totalPaidPaise: Paise;
  overdueAmountPaise: Paise;
}

export interface LoanSettlementVM {
  settlementDate: IsoDate | null;
  settlementAmountPaise: Paise;
  paymentFrequency: PayFrequency | null;
  installmentAmountPaise: Paise | null;
  paidSinceSettlementPaise: Paise;
  balancePaise: Paise;
}

export interface LoanListItemVM {
  /** Opaque loanRef, assigned verbatim. Never parsed, never persisted across logins. */
  loanId: string;
  accountNumber: string;
  status: LoanStatus; // domain, normalized (adapter.toLoanStatus)
  isOverdue: boolean; // overdueAmountPaise > 0
  emiAmountPaise: Paise;
  outstandingPaise: Paise;
  overdueAmountPaise: Paise;
  /**
   * Next EMI due date for the Home table. Mock mode fills it (null = none). LIVE list responses
   * carry no due date, so the adapter leaves it `undefined` and Home falls back to the loan
   * detail's `nextCollectionDate` (weekly loans only).
   */
  nextDueDate?: IsoDate | null;
}

export interface LoanDetailVM extends LoanListItemVM {
  startDate: IsoDate | null;
  loanDate: IsoDate | null;
  maturityDate: IsoDate | null;
  payFrequency: PayFrequency | null;
  principalPaise: Paise; // financedAmount
  totalPaidPaise: Paise;
  numberOfInstallments: number | null;
  weeklyOff: string | null;
  nextCollectionDate: IsoDate | null;
  installmentsOverdue: number | null;
  lastPayment: LastPaymentVM | null;
  disbursal: LoanDisbursalVM | null;
  dues: LoanDuesVM | null;
  settlement: LoanSettlementVM | null;
}

export interface TransactionVM {
  date: IsoDate | null;
  rawDate: string;
  type: string;
  description: string;
  direction: 'credit' | 'debit';
  amountPaise: Paise;
  paymentMode: string | null;
  channel: string | null;
}

export interface TransactionsPageVM {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  totalCreditPaise: Paise;
  totalDebitPaise: Paise;
  transactions: TransactionVM[];
}

export interface LoansSummaryVM {
  /** Sorted: overdue first, then by account number. */
  activeLoans: LoanListItemVM[];
  closedLoans: LoanListItemVM[];
  totalOutstandingPaise: Paise; // sum over active
  overdueTotalPaise: Paise; // sum over active
  overdueLoanCount: number;
  // NOTE: no nextDue (no wire source), no asOf.
}

/** The four prototype request states, preserved across the mock and live paths. */
export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'session_expired' }
  | { status: 'success'; data: T };
