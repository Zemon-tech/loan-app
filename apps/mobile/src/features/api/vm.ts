/**
 * View models — the shape BOTH the live adapter and the mock adapter produce, built from
 * @app/shared SCALAR domain types (integer paise, IST `YYYY-MM-DD`, uppercase LoanStatus).
 * The two live screens (loans list + loan detail) consume one shape in both modes.
 *
 * `QueryState<T>` (the four prototype states) lives here so the TanStack live hooks and the
 * retained mock path (features/system/mockQuery.ts) share one definition.
 */
import type { IsoDate, LoanStatus, Paise, PayFrequency } from '@app/shared';

export interface LoanListItemVM {
  /** Opaque loanRef, assigned verbatim. Never parsed, never persisted across logins. */
  loanId: string;
  accountNumber: string;
  status: LoanStatus; // domain, normalized (adapter.toLoanStatus)
  isOverdue: boolean; // overdueAmountPaise > 0
  emiAmountPaise: Paise;
  outstandingPaise: Paise;
  overdueAmountPaise: Paise;
}

export interface LoanDetailVM extends LoanListItemVM {
  loanDate: IsoDate | null;
  maturityDate: IsoDate | null;
  payFrequency: PayFrequency | null;
  principalPaise: Paise; // financedAmount
  totalPaidPaise: Paise;
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
