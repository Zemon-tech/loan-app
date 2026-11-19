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
  };
}

export function mockLoanToDetailVM(loan: Loan): LoanDetailVM {
  const overdueAmountPaise = paise(loan.overdueAmount);
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
      installmentsDuePaise: paise(loan.totalDue),
      lateFeesPaise: paise(loan.lateFee),
      overdueInterestPaise: paise(loan.overdueInterest),
      recoveryVisitChargesPaise: paise(loan.recoveryCharges),
      discountPaise: paise(loan.discount),
      totalDuePaise: paise(loan.totalDue + loan.lateFee + loan.overdueInterest + loan.recoveryCharges - loan.discount),
      installmentPaymentsPaise: paise(loan.totalPaid),
      advanceInstallmentPaise: 0,
      adjustmentsPaise: 0,
      totalPaidPaise: paise(loan.totalPaid),
      overdueAmountPaise,
    },
    settlement: null,
  };
}

export function mockTransactionToVM(t: Transaction): TransactionVM {
  return {
    date: dateToIsoDate(t.date),
    rawDate: t.date.toISOString(),
    type:
      t.type === 'PAYMENT'
        ? 'installment_payment'
        : t.type === 'CHARGE'
          ? 'late_fee'
          : t.type === 'DISCOUNT'
            ? 'discount'
            : 'adjustment_received',
    description: t.label,
    direction: t.type === 'CHARGE' ? 'debit' : 'credit',
    amountPaise: paise(Math.abs(t.amount)),
    paymentMode: t.mode ?? null,
    channel: t.mode === 'Online' ? 'Online' : 'Office',
  };
}

export function mockLoanTransactionsToPageVM(loan: Loan): TransactionsPageVM {
  const transactions = loan.transactions.map(mockTransactionToVM);
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
