/**
 * Fake fixture data for the demo backend (PRD Appendix C). FAKE identities only — never real
 * customer data (PRD rule 6). The MockLoanRepository serves these; schedule/summary are derived
 * from loan terms via @app/shared so every number satisfies the PRD invariants.
 *
 * Loan A mirrors the golden test (PRD 12.4): DAILY, 100 EMIs @ ₹1,200, paid 39,000 as of
 * 2026-09-19 — overdue + partially paid. Loan B is CLOSED (fully paid).
 */

import type {
  CustomerRecord,
  LoanChargesRecord,
  LoanRecord,
  TransactionRecord,
} from '../LoanRepository.js';

/** The demo "today" used across fixtures so derived schedules are deterministic (PRD App. C). */
export const FIXTURE_AS_OF_DATE = '2026-09-19';

/** Fixed demo OTP for the store-review account (PRD 11.1 dev mode / 16.3). */
export const FIXTURE_DEMO_OTP = '123456';

export const FIXTURE_CUSTOMER: CustomerRecord = {
  customerId: 'cu_demo1',
  fullName: 'Demo Customer',
  mobileE164: '+919999900001',
  city: 'Demo City',
};

/** Loan A — active/overdue, partially paid; matches the golden test exactly. */
export const LOAN_A: LoanRecord = {
  loanId: 'ln_demo_a',
  accountNumber: 'A00001',
  productName: 'Regular',
  loanDate: '2026-06-15',
  firstInstallmentDate: '2026-06-16',
  principalPaise: 10_000_000,
  totalInterestPaise: 2_000_000,
  emiAmountPaise: 120_000,
  payFrequency: 'DAILY',
  totalInstallments: 100,
  maturityDate: null, // derived -> last installment due date 2026-09-23
  branchName: 'Demo Branch',
  totalInstallmentPaidPaise: 3_900_000,
  internalStatus: 'ACTIVE', // mapped to ACTIVE/OVERDUE/CLOSED by the DTO layer
};

export const LOAN_A_CHARGES: LoanChargesRecord = {
  lateFeePaise: 0,
  overdueInterestPaise: 1_316_700,
  recoveryChargesPaise: 0,
  discountPaise: 0,
  adjustedPaise: 0,
};

/** Loan B — closed (fully paid). Monthly, 12 EMIs. */
export const LOAN_B: LoanRecord = {
  loanId: 'ln_demo_b',
  accountNumber: 'D00002',
  productName: 'Monthly',
  loanDate: '2025-01-10',
  firstInstallmentDate: '2025-02-10',
  principalPaise: 5_000_000,
  totalInterestPaise: 600_000,
  emiAmountPaise: 466_667,
  // payable = principal + interest = 5,600,000. Last installment is 466,663 so the 12
  // installments sum to exactly 5,600,000 and a fully-paid loan has outstanding = 0.
  finalInstallmentAmountPaise: 466_663,
  payFrequency: 'MONTHLY',
  totalInstallments: 12,
  maturityDate: '2026-01-10',
  branchName: 'Demo Branch',
  totalInstallmentPaidPaise: 5_600_000,
  internalStatus: 'CLOSED',
};

export const LOAN_B_CHARGES: LoanChargesRecord = {
  lateFeePaise: 0,
  overdueInterestPaise: 0,
  recoveryChargesPaise: 0,
  discountPaise: 0,
  adjustedPaise: 0,
};

/**
 * Build loan A transactions that sum EXACTLY to totalInstallmentPaidPaise (3,900,000),
 * mixing ONLINE and CASH, including the required ₹5,000 ONLINE payment on 2026-09-11
 * (PRD Appendix A/C). Newest-first ordering is applied by the repository, not here.
 */
function buildLoanATransactions(): TransactionRecord[] {
  const target = LOAN_A.totalInstallmentPaidPaise; // 3,900,000
  const txns: TransactionRecord[] = [];

  // The one explicit payment required by the PRD sample.
  const KNOWN = { date: '2026-09-11', amountPaise: 500_000, mode: 'ONLINE' as const };
  let remaining = target - KNOWN.amountPaise; // 3,400,000 to distribute across the rest

  // Spread the remainder over ~44 daily collection entries from the loan start, alternating
  // ONLINE/CASH. Each is a round paise value; the final entry absorbs the rounding remainder
  // so the sum is exact.
  const COUNT = 44;
  const base = Math.floor(remaining / COUNT / 100) * 100; // round to whole rupees
  let startDate = '2026-06-16';
  for (let i = 0; i < COUNT; i += 1) {
    const isLast = i === COUNT - 1;
    const amountPaise = isLast ? remaining : base;
    remaining -= amountPaise;
    txns.push({
      id: `tx_a_${String(i + 1).padStart(3, '0')}`,
      date: addDaysLocal(startDate, i * 2), // every other day
      amountPaise,
      type: 'PAYMENT',
      mode: i % 2 === 0 ? 'CASH' : 'ONLINE',
      referenceNo: i % 2 === 0 ? undefined : `TXN${100000 + i}`,
      receiptNo: `RCPT${200000 + i}`,
    });
  }

  txns.push({
    id: 'tx_a_known',
    date: KNOWN.date,
    amountPaise: KNOWN.amountPaise,
    type: 'PAYMENT',
    mode: KNOWN.mode,
    referenceNo: 'TXN590011',
    receiptNo: 'RCPT290011',
  });

  return txns;
}

/** Loan B: 12 monthly payments summing exactly to 5,600,004. */
function buildLoanBTransactions(): TransactionRecord[] {
  const txns: TransactionRecord[] = [];
  for (let i = 0; i < 12; i += 1) {
    const isLast = i === 11;
    txns.push({
      id: `tx_b_${String(i + 1).padStart(3, '0')}`,
      date: addMonthsLocal('2025-02-10', i),
      // 11 × 466,667 + 466,663 = 5,600,000 = totalInstallmentPaidPaise (= payable)
      amountPaise: isLast ? 466_663 : 466_667,
      type: 'PAYMENT',
      mode: 'ONLINE',
      referenceNo: `TXNB${300000 + i}`,
      receiptNo: `RCPTB${400000 + i}`,
    });
  }
  return txns;
}

// Small local date helpers (kept local to fixtures to avoid importing the whole shared module
// here; the repository/mappers use @app/shared for all real date logic).
function addDaysLocal(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function addMonthsLocal(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1 + n, d));
  return dt.toISOString().slice(0, 10);
}

export const LOAN_A_TRANSACTIONS: TransactionRecord[] = buildLoanATransactions();
export const LOAN_B_TRANSACTIONS: TransactionRecord[] = buildLoanBTransactions();

/** Registry keyed by loanId, scoped under the demo customer. */
export const FIXTURE_LOANS: Record<
  string,
  { loan: LoanRecord; charges: LoanChargesRecord; transactions: TransactionRecord[] }
> = {
  [LOAN_A.loanId]: { loan: LOAN_A, charges: LOAN_A_CHARGES, transactions: LOAN_A_TRANSACTIONS },
  [LOAN_B.loanId]: { loan: LOAN_B, charges: LOAN_B_CHARGES, transactions: LOAN_B_TRANSACTIONS },
};

/** Which customer owns which loans (so the mock can enforce per-customer scoping). */
export const FIXTURE_OWNERSHIP: Record<string, string[]> = {
  [FIXTURE_CUSTOMER.customerId]: [LOAN_A.loanId, LOAN_B.loanId],
};
