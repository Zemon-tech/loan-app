/**
 * API response DTO types — the customer-safe contract shared by the mobile app and the API
 * (PRD 10.3). These are the ONLY shapes the API returns to clients; the API builds them with
 * whitelist mappers from internal records (PRD A4). Mobile imports them for its typed client.
 *
 * Money is integer paise (fields end in `Paise`). Dates are IST calendar dates `YYYY-MM-DD`.
 * Reuses scalar + schedule types from the sibling modules.
 */

import type { Paise } from '../money.js';
import type { IsoDate } from '../dates.js';
import type { InstallmentStatus, LoanStatus, NextDue, PayFrequency } from './schedule.js';

export type IsoDateTime = string; // ISO 8601 with offset, e.g. 2026-09-19T10:30:00+05:30

// NextDue is defined once in ./schedule.js and re-exported here for API consumers.
export type { NextDue };

export type TxnType = 'PAYMENT' | 'CHARGE' | 'DISCOUNT' | 'ADJUSTMENT';
export type TxnMode = 'ONLINE' | 'CASH' | 'OTHER';

/** Authenticated customer (full mobile only ever appears here — PRD 10.3). */
export interface Me {
  customerId: string;
  fullName: string;
  mobile: string; // "+919876543210"
  email?: string;
  city?: string;
  photoUrl?: string;
}

export interface LastPayment {
  date: IsoDate;
  amountPaise: Paise;
}

export interface LoanSummary {
  loanId: string;
  accountNumber: string;
  productName: string;
  status: LoanStatus;
  loanDate: IsoDate;
  principalPaise: Paise;
  emiAmountPaise: Paise;
  payFrequency: PayFrequency;
  totalInstallments: number;
  installmentsPaid: number;
  installmentsRemaining: number;
  outstandingPaise: Paise;
  overdueInstallmentsPaise: Paise;
  overdueInstallmentsCount: number;
  nextDue: NextDue | null;
  lastPayment: LastPayment | null;
  maturityDate: IsoDate | null;
}

export interface LoanFinancials {
  principalPaise: Paise;
  totalInterestPaise: Paise;
  payablePaise: Paise; // principal + interest
  lateFeePaise: Paise;
  overdueInterestPaise: Paise;
  recoveryChargesPaise: Paise;
  discountPaise: Paise;
  adjustedPaise: Paise;
  totalDuePaise: Paise; // payable + charges - discount
  totalPaidPaise: Paise;
  outstandingPaise: Paise; // totalDue - adjusted - totalPaid
}

export interface KeyFacts {
  aprPercent?: number;
  kfsDocumentUrl?: string;
}

export interface LoanDetail extends LoanSummary {
  asOf: IsoDateTime;
  firstInstallmentDate: IsoDate;
  branchName: string | null;
  financials: LoanFinancials;
  paymentBreakup: { onlinePaidPaise: Paise; cashPaidPaise: Paise };
  keyFacts?: KeyFacts; // optional; copied from client data, never computed by us
}

/** A single installment as returned to the client (PRD 10.3). */
export interface InstallmentDto {
  number: number;
  dueDate: IsoDate;
  amountPaise: Paise;
  paidPaise: Paise;
  status: InstallmentStatus;
  isOverdue: boolean;
  paidOn?: IsoDate;
}

export interface ScheduleResponse {
  asOf: IsoDateTime;
  summary: {
    total: number;
    paid: number;
    partial: number;
    overdue: number;
    dueToday: number;
    upcoming: number;
  };
  items: InstallmentDto[];
}

export interface Transaction {
  id: string;
  date: IsoDate;
  amountPaise: Paise; // always positive; direction implied by type
  type: TxnType;
  mode: TxnMode;
  referenceNo?: string;
  receiptNo?: string;
}

export interface LoansResponse {
  asOf: IsoDateTime;
  totals: { outstandingPaise: Paise; overdueInstallmentsPaise: Paise };
  loans: LoanSummary[];
}

export interface TransactionsResponse {
  items: Transaction[];
  nextCursor: string | null;
}
