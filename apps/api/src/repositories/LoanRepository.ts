/**
 * Repository interface for client data (PRD 14.2).
 *
 * Rules:
 *  - All client-DB access goes through this interface; no SQL anywhere else (PRD A2).
 *  - Every method that reads a loan takes `customerId` as its mandatory first argument and
 *    MUST filter by it (PRD A3). No method fetches a loan by loanId alone.
 *  - Raw rows are internal `*Record` types. Public DTOs are produced ONLY by whitelist
 *    mappers in modules (PRD A4) — never return a *Record to a client.
 *
 * Two implementations:
 *  - MockLoanRepository  (fixtures; used in dev/tests and before DB_MAPPING.md is filled)
 *  - MysqlLoanRepository (real; added once docs/DB_MAPPING.md maps the client schema)
 */

import type { IsoDate, PayFrequency } from '@app/shared';

/** Internal customer record (superset of the public `Me` DTO). */
export interface CustomerRecord {
  customerId: string;
  fullName: string;
  /** Stored mobile, normalised to E.164 at the repository boundary. */
  mobileE164: string;
  email?: string;
  city?: string;
  photoUrl?: string;
}

/** Internal loan record — raw financials in paise, before DTO whitelisting. */
export interface LoanRecord {
  loanId: string;
  accountNumber: string;
  productName: string;
  loanDate: IsoDate;
  firstInstallmentDate: IsoDate;
  principalPaise: number;
  totalInterestPaise: number;
  emiAmountPaise: number;
  finalInstallmentAmountPaise?: number;
  payFrequency: PayFrequency;
  totalInstallments: number;
  weeklyOffWeekday?: number;
  maturityDate: IsoDate | null;
  branchName: string | null;
  /** The DB's installment-paid / credited total (drives FIFO schedule allocation). */
  totalInstallmentPaidPaise: number;
  /** Raw internal status mapped to ACTIVE/OVERDUE/CLOSED by the DTO layer (PRD Q8). */
  internalStatus: string;
}

/** Stored charges, ALWAYS read from the DB — never computed by us (PRD Q7). */
export interface LoanChargesRecord {
  lateFeePaise: number;
  overdueInterestPaise: number;
  recoveryChargesPaise: number;
  discountPaise: number;
  adjustedPaise: number;
}

export type TxnType = 'PAYMENT' | 'CHARGE' | 'DISCOUNT' | 'ADJUSTMENT';
export type TxnMode = 'ONLINE' | 'CASH' | 'OTHER';

export interface TransactionRecord {
  id: string;
  date: IsoDate;
  amountPaise: number;
  type: TxnType;
  mode: TxnMode;
  referenceNo?: string;
  receiptNo?: string;
}

/** Optional installment row — only if the client DB has a schedule table (PRD Q3). */
export interface InstallmentRecord {
  number: number;
  dueDate: IsoDate;
  amountPaise: number;
  paidPaise: number;
  paidOn?: IsoDate;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface LoanRepository {
  /** Auth lookup; expects exactly one match (PRD Q4). */
  findCustomersByMobile(mobileE164: string): Promise<CustomerRecord[]>;
  getCustomer(customerId: string): Promise<CustomerRecord | null>;

  listLoans(customerId: string): Promise<LoanRecord[]>;
  /** MUST filter by customerId (PRD A3). */
  getLoan(customerId: string, loanId: string): Promise<LoanRecord | null>;

  getLoanCharges(customerId: string, loanId: string): Promise<LoanChargesRecord>;
  /** Present only when the client DB has an installment table (PRD Q3). */
  listInstallments?(customerId: string, loanId: string): Promise<InstallmentRecord[]>;
  listTransactions(
    customerId: string,
    loanId: string,
    page: { cursor?: string; limit: number },
  ): Promise<Page<TransactionRecord>>;
  sumPayments(
    customerId: string,
    loanId: string,
  ): Promise<{ onlinePaise: number; cashPaise: number; totalPaise: number }>;
}
