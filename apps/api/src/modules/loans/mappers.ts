/**
 * DTO whitelist mappers (PRD A4, task A-06).
 *
 * These are the ONLY functions that turn internal *Record types into customer-facing DTOs.
 * Rules:
 *  - Build each DTO by EXPLICITLY naming every field. Never spread a record (`...record`),
 *    never serialise a raw row — that is how blacklisted fields (PRD Appendix B) leak.
 *  - Money stays integer paise. Dates stay IST calendar strings.
 *  - Loan status + schedule-derived numbers come from @app/shared (computeSchedule), so the
 *    API's numbers match the mobile app and the client's web app (PRD G6).
 *
 * A contract test (test/blacklist.test.ts) scans the output of these mappers for any
 * blacklisted key and fails if one appears.
 */

import {
  computeSchedule,
  type Installment,
  type InstallmentDto,
  type IsoDate,
  type IsoDateTime,
  type LastPayment,
  type LoanDetail,
  type LoanFinancials,
  type LoanStatus,
  type LoanSummary,
  type Me,
  type NextDue,
  type ScheduleResponse,
  type Transaction,
} from '@app/shared';
import type {
  CustomerRecord,
  LoanChargesRecord,
  LoanRecord,
  TransactionRecord,
} from '../../repositories/LoanRepository.js';

/** Derived schedule result bundled with the loan for mapping (computed once per request). */
export interface DerivedSchedule {
  items: Installment[];
  installmentsPaid: number;
  installmentsRemaining: number;
  overdueInstallmentsPaise: number;
  overdueInstallmentsCount: number;
  nextDue: NextDue | null;
  maturityDate: IsoDate | null;
  status: LoanStatus;
}

/** Run the shared schedule calculator for a loan as of a given IST date. */
export function deriveSchedule(loan: LoanRecord, asOfDate: IsoDate): DerivedSchedule {
  const r = computeSchedule({
    firstInstallmentDate: loan.firstInstallmentDate,
    payFrequency: loan.payFrequency,
    totalInstallments: loan.totalInstallments,
    emiAmountPaise: loan.emiAmountPaise,
    finalInstallmentAmountPaise: loan.finalInstallmentAmountPaise,
    weeklyOffWeekday: loan.weeklyOffWeekday,
    totalInstallmentPaidPaise: loan.totalInstallmentPaidPaise,
    maturityDate: loan.maturityDate,
    dbClosed: loan.internalStatus.toUpperCase() === 'CLOSED',
    asOfDate,
  });
  return {
    items: r.items,
    installmentsPaid: r.installmentsPaid,
    installmentsRemaining: r.installmentsRemaining,
    overdueInstallmentsPaise: r.overdueInstallmentsPaise,
    overdueInstallmentsCount: r.overdueInstallmentsCount,
    nextDue: r.nextDue,
    maturityDate: r.maturityDate,
    status: r.status,
  };
}

/** Assemble LoanFinancials from loan + stored charges + schedule-derived outstanding. */
export function toFinancials(loan: LoanRecord, charges: LoanChargesRecord): LoanFinancials {
  const principalPaise = loan.principalPaise;
  const totalInterestPaise = loan.totalInterestPaise;
  const payablePaise = principalPaise + totalInterestPaise;
  const totalDuePaise =
    payablePaise +
    charges.lateFeePaise +
    charges.overdueInterestPaise +
    charges.recoveryChargesPaise -
    charges.discountPaise;
  const totalPaidPaise = loan.totalInstallmentPaidPaise;
  const outstandingPaise = totalDuePaise - charges.adjustedPaise - totalPaidPaise;

  return {
    principalPaise,
    totalInterestPaise,
    payablePaise,
    lateFeePaise: charges.lateFeePaise,
    overdueInterestPaise: charges.overdueInterestPaise,
    recoveryChargesPaise: charges.recoveryChargesPaise,
    discountPaise: charges.discountPaise,
    adjustedPaise: charges.adjustedPaise,
    totalDuePaise,
    totalPaidPaise,
    outstandingPaise,
  };
}

/** Last payment = most recent PAYMENT transaction, or null. */
export function toLastPayment(txns: TransactionRecord[]): LastPayment | null {
  let latest: TransactionRecord | null = null;
  for (const t of txns) {
    if (t.type !== 'PAYMENT') continue;
    if (!latest || t.date > latest.date) latest = t;
  }
  return latest ? { date: latest.date, amountPaise: latest.amountPaise } : null;
}

export function toMeDto(c: CustomerRecord): Me {
  const me: Me = {
    customerId: c.customerId,
    fullName: c.fullName,
    mobile: c.mobileE164,
  };
  if (c.email !== undefined) me.email = c.email;
  if (c.city !== undefined) me.city = c.city;
  if (c.photoUrl !== undefined) me.photoUrl = c.photoUrl;
  return me;
}

export function toLoanSummaryDto(
  loan: LoanRecord,
  charges: LoanChargesRecord,
  sched: DerivedSchedule,
  lastPayment: LastPayment | null,
): LoanSummary {
  const financials = toFinancials(loan, charges);
  return {
    loanId: loan.loanId,
    accountNumber: loan.accountNumber,
    productName: loan.productName,
    status: sched.status,
    loanDate: loan.loanDate,
    principalPaise: loan.principalPaise,
    emiAmountPaise: loan.emiAmountPaise,
    payFrequency: loan.payFrequency,
    totalInstallments: loan.totalInstallments,
    installmentsPaid: sched.installmentsPaid,
    installmentsRemaining: sched.installmentsRemaining,
    outstandingPaise: financials.outstandingPaise,
    overdueInstallmentsPaise: sched.overdueInstallmentsPaise,
    overdueInstallmentsCount: sched.overdueInstallmentsCount,
    nextDue: sched.nextDue,
    lastPayment,
    maturityDate: sched.maturityDate,
  };
}

export function toLoanDetailDto(
  loan: LoanRecord,
  charges: LoanChargesRecord,
  sched: DerivedSchedule,
  payments: { onlinePaise: number; cashPaise: number },
  lastPayment: LastPayment | null,
  asOf: IsoDateTime,
): LoanDetail {
  const summary = toLoanSummaryDto(loan, charges, sched, lastPayment);
  return {
    ...summary, // summary is itself a whitelisted DTO (safe), extended with detail fields
    asOf,
    firstInstallmentDate: loan.firstInstallmentDate,
    branchName: loan.branchName,
    financials: toFinancials(loan, charges),
    paymentBreakup: {
      onlinePaidPaise: payments.onlinePaise,
      cashPaidPaise: payments.cashPaise,
    },
  };
}

export function toInstallmentDto(i: Installment): InstallmentDto {
  const dto: InstallmentDto = {
    number: i.number,
    dueDate: i.dueDate,
    amountPaise: i.amountPaise,
    paidPaise: i.paidPaise,
    status: i.status,
    isOverdue: i.isOverdue,
  };
  if (i.paidOn !== undefined) dto.paidOn = i.paidOn;
  return dto;
}

export function toScheduleResponse(sched: DerivedSchedule, asOf: IsoDateTime): ScheduleResponse {
  const items = sched.items.map(toInstallmentDto);
  const summary = { total: items.length, paid: 0, partial: 0, overdue: 0, dueToday: 0, upcoming: 0 };
  for (const i of items) {
    switch (i.status) {
      case 'PAID': summary.paid += 1; break;
      case 'PARTIAL': summary.partial += 1; break;
      case 'OVERDUE': summary.overdue += 1; break;
      case 'DUE_TODAY': summary.dueToday += 1; break;
      case 'UPCOMING': summary.upcoming += 1; break;
    }
  }
  return { asOf, summary, items };
}

export function toTransactionDto(t: TransactionRecord): Transaction {
  const dto: Transaction = {
    id: t.id,
    date: t.date,
    amountPaise: t.amountPaise,
    type: t.type,
    mode: t.mode,
  };
  if (t.referenceNo !== undefined) dto.referenceNo = t.referenceNo;
  if (t.receiptNo !== undefined) dto.receiptNo = t.receiptNo;
  return dto;
}
