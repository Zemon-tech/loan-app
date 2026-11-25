/**
 * Mock adapter (FR-0i, AC-14) — converts the placeholder `Loan`/`Loan[]` into the SAME VMs the
 * live adapter produces, so the loans list + detail screens render ONE shape in both modes.
 *
 * Obeys the same @app/shared rules as the live path:
 *   - Money: placeholder rupee NUMBERS -> rupeesToPaise -> assertPaise (no float math).
 *   - Dates: placeholder local-midnight JS `Date`s -> `YYYY-MM-DD` built from the Date's LOCAL
 *     calendar fields (they were constructed with new Date(y, m-1, d)), then normalized through
 *     the shared isoDateTimeToIstDate (which returns a date-only value verbatim). No new
 *     `new Date()` IST clock logic is introduced in app code.
 *   - Status: placeholder LoanStatus flows through the same toLoanStatus + overdue override.
 */
import { assertPaise, isoDateTimeToIstDate, rupeesToPaise, type IsoDate } from '@app/shared';

import { toLoanStatus, toPayFrequency } from './adapter';
import type { Loan, Transaction } from '@/features/loans/placeholderData';
import type {
  LoanDetailVM,
  LoanListItemVM,
  TransactionVM,
  TransactionsPageVM,
} from './vm';

const pad = (n: number) => String(n).padStart(2, '0');

/** A placeholder local-midnight Date -> IsoDate via its local calendar fields + shared helper. */
function dateToIsoDate(d: Date): IsoDate {
  const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return isoDateTimeToIstDate(ymd);
}

function paise(rupees: number): number {
  return assertPaise(rupeesToPaise(rupees));
}

export function mockLoanToListItemVM(loan: Loan): LoanListItemVM {
  const overdueAmountPaise = paise(loan.overdueAmount);
  return {
    loanId: loan.loanId,
    accountNumber: loan.accountNumber,
    status: toLoanStatus(loan.status, overdueAmountPaise),
    isOverdue: overdueAmountPaise > 0,
    emiAmountPaise: paise(loan.emiAmount),
    outstandingPaise: paise(loan.outstanding),
    overdueAmountPaise,
    nextDueDate: loan.nextDue ? dateToIsoDate(loan.nextDue.date) : null,
    loanDate: dateToIsoDate(loan.loanDate),
    maturityDate: dateToIsoDate(loan.maturityDate),
    principalPaise: paise(loan.loanAmount),
    numberOfInstallments: loan.totalEmis,
  };
}

export function mockLoanToDetailVM(loan: Loan): LoanDetailVM {
  const overdueAmountPaise = paise(loan.overdueAmount);
  // Instalments that have fallen due so far (everything except UPCOMING), like the live API's
  // dues.installmentsDue (it is NOT the full loan total).
  const dueSoFar = loan.schedule.filter((i) => i.status !== 'UPCOMING').reduce((sum, i) => sum + i.amount, 0);
  return {
    ...mockLoanToListItemVM(loan),
    startDate: dateToIsoDate(loan.firstEmiDate),
    loanDate: dateToIsoDate(loan.loanDate),
    maturityDate: dateToIsoDate(loan.maturityDate),
    payFrequency: toPayFrequency(loan.frequency),
    principalPaise: paise(loan.loanAmount),
    totalPaidPaise: paise(loan.totalPaid),
    numberOfInstallments: loan.totalEmis,
    weeklyOff: null,
    nextCollectionDate: loan.nextDue ? dateToIsoDate(loan.nextDue.date) : null,
    installmentsOverdue: loan.overdueInstallments,
    lastPayment: loan.lastPayment
      ? {
          amountPaise: paise(loan.lastPayment.amount),
          date: dateToIsoDate(loan.lastPayment.date),
        }
      : null,
    disbursal: {
      loanAmountPaise: paise(loan.loanAmount),
      serviceChargesPaise: paise(1000),
      verificationChargesPaise: paise(500),
      advanceInstallmentPaise: paise(loan.emiAmount),
      previousLoanAdjustmentPaise: 0,
      totalDeductionsPaise: paise(1500 + loan.emiAmount),
      amountDisbursedPaise: paise(loan.loanAmount - (1500 + loan.emiAmount)),
    },
    dues: {
      installmentsDuePaise: paise(dueSoFar),
      lateFeesPaise: paise(loan.lateFee),
      overdueInterestPaise: paise(loan.overdueInterest),
      recoveryVisitChargesPaise: paise(loan.recoveryCharges),
      discountPaise: paise(loan.discount),
      totalDuePaise: paise(dueSoFar + loan.lateFee + loan.overdueInterest + loan.recoveryCharges - loan.discount),
      installmentPaymentsPaise: paise(loan.totalPaid),
      advanceInstallmentPaise: 0,
      adjustmentsPaise: 0,
      totalPaidPaise: paise(loan.totalPaid),
      overdueAmountPaise,
    },
    settlement: null,
  };
}

/** Maps a placeholder transaction onto the API's vocabulary (paymentMode / channel for payments only). */
export function mockTransactionToVM(t: Transaction): TransactionVM {
  const isPayment = t.type === 'PAYMENT';
  const cash = t.mode === 'Cash';
  const upi = (t.modeDetail ?? '').toUpperCase().includes('UPI');
  return {
    date: dateToIsoDate(t.date),
    rawDate: t.date.toISOString(),
    type: isPayment
      ? 'installment_payment'
      : t.type === 'CHARGE'
        ? 'late_fee'
        : t.type === 'DISCOUNT'
          ? 'discount'
          : 'adjustment_received',
    description: t.label,
    direction: t.type === 'CHARGE' || (t.type === 'ADJUSTMENT' && t.amount < 0) ? 'debit' : 'credit',
    amountPaise: paise(Math.abs(t.amount)),
    paymentMode: isPayment ? (cash ? 'Cash' : upi ? 'UPI' : 'Bank') : null,
    channel: isPayment ? (cash ? (t.referenceNo ? 'Agent' : 'Office') : 'Online') : null,
  };
}/**
 * Demo ledger for ONE mock loan (ln_demo_e) that shows every API transaction type and every
 * paymentMode / channel combination, so each History row style can be reviewed in mock mode.
 * Fake data; newest first like the API.
 */
const SHOWCASE_LOAN_ID = 'ln_demo_e';
type ShowcaseRow = [date: string, type: string, description: string, direction: 'credit' | 'debit', rupees: number, mode: string | null, channel: string | null];
const SHOWCASE_ROWS: ShowcaseRow[] = [
  ['2026-09-19', 'installment_payment', 'Installment payment', 'credit', 200, 'UPI', 'Online'],
  ['2026-09-18', 'installment_payment', 'Installment payment', 'credit', 200, 'Cash', 'Agent'],
  ['2026-09-17', 'installment_payment', 'Installment payment', 'credit', 200, 'Cash', 'Office'],
  ['2026-09-16', 'installment_payment', 'Installment payment', 'credit', 200, 'Bank', 'Online'],
  ['2026-09-15', 'installment_payment', 'Installment payment', 'credit', 200, 'Bank', 'Office'],
  ['2026-09-14', 'installment_payment', 'Installment payment', 'credit', 400, 'Wallet', 'Online'],
  ['2026-09-13', 'installment_payment', 'Installment payment', 'credit', 200, 'Other', 'Office'],
  ['2026-09-12', 'late_fee', 'Late fee', 'debit', 100, null, null],
  ['2026-09-11', 'overdue_interest', 'Overdue interest', 'debit', 50, null, null],
  ['2026-09-10', 'recovery_visit_charge', 'Recovery visit charge', 'debit', 150, null, null],
  ['2026-09-09', 'discount', 'Discount', 'credit', 100, null, null],
  ['2026-09-08', 'adjustment_received', 'Adjustment received from another loan', 'credit', 500, null, null],
  ['2026-09-07', 'principal_repayment', 'Principal repayment', 'credit', 1000, 'UPI', 'Online'],
  ['2026-09-05', 'additional_loan', 'Additional loan', 'debit', 2000, null, null],
  ['2026-08-28', 'previous_loan_adjustment', 'Previous loan adjustment', 'debit', 1500, null, null],
  ['2026-08-24', 'other', 'Other credit', 'credit', 25, null, null],
  ['2026-08-20', 'other', 'Other charge with a long description to check how two lines wrap in a row', 'debit', 75, null, null],
  ['2026-08-11', 'advance_installment', 'Advance installment', 'credit', 200, 'Cash', 'Agent'],
  ['2026-08-10', 'loan_disbursed', 'Loan disbursed', 'debit', 20000, null, null],
];

function showcaseTransactions(): TransactionVM[] {
  return SHOWCASE_ROWS.map(([date, type, description, direction, rupees, paymentMode, channel]) => ({
    date: isoDateTimeToIstDate(date),
    rawDate: `${date}T00:00:00`,
    type,
    description,
    direction,
    amountPaise: paise(rupees),
    paymentMode,
    channel,
  }));
}
export function mockLoanTransactionsToPageVM(loan: Loan): TransactionsPageVM {
  const transactions =
    loan.loanId === SHOWCASE_LOAN_ID ? showcaseTransactions() : loan.transactions.map(mockTransactionToVM);
  const totalCreditPaise = transactions
    .filter((t) => t.direction === 'credit')
    .reduce((s, t) => s + t.amountPaise, 0);
  const totalDebitPaise = transactions
    .filter((t) => t.direction === 'debit')
    .reduce((s, t) => s + t.amountPaise, 0);

  return {
    page: 1,
    pageSize: 50,
    totalCount: transactions.length,
    totalPages: 1,
    totalCreditPaise,
    totalDebitPaise,
    transactions,
  };
}
