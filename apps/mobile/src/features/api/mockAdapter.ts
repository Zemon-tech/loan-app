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
import type { Loan } from '@/features/loans/placeholderData';
import type { LoanDetailVM, LoanListItemVM } from './vm';

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
  return {
    ...mockLoanToListItemVM(loan),
    loanDate: dateToIsoDate(loan.loanDate),
    maturityDate: dateToIsoDate(loan.maturityDate),
    payFrequency: toPayFrequency(loan.frequency),
    principalPaise: paise(loan.loanAmount),
    totalPaidPaise: paise(loan.totalPaid),
  };
}
