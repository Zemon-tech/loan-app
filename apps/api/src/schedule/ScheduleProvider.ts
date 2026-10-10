/**
 * ScheduleProvider (PRD 12.1).
 *
 * Use the client's data when it exists. If the DB has an installment table, DbScheduleProvider
 * maps it; otherwise ComputedScheduleProvider generates the schedule from loan terms using the
 * shared pure calculator (`computeSchedule` from @app/shared) — the SAME function the mobile app
 * uses, so the numbers always match (PRD G6). Charges are read from the DB, never computed here.
 */

import { computeSchedule, type Installment, type IsoDate } from '@app/shared';
import type { LoanRecord } from '../repositories/LoanRepository.js';

export interface ScheduleProviderInput {
  customerId: string;
  loan: LoanRecord;
  asOfDate: IsoDate;
}

export interface ScheduleProvider {
  getSchedule(input: ScheduleProviderInput): Promise<Installment[]>;
}

/** Computes the schedule from loan terms via the shared calculator. */
export class ComputedScheduleProvider implements ScheduleProvider {
  async getSchedule({ loan, asOfDate }: ScheduleProviderInput): Promise<Installment[]> {
    const result = computeSchedule({
      firstInstallmentDate: loan.firstInstallmentDate,
      payFrequency: loan.payFrequency,
      totalInstallments: loan.totalInstallments,
      emiAmountPaise: loan.emiAmountPaise,
      finalInstallmentAmountPaise: loan.finalInstallmentAmountPaise,
      weeklyOffWeekday: loan.weeklyOffWeekday,
      totalInstallmentPaidPaise: loan.totalInstallmentPaidPaise,
      maturityDate: loan.maturityDate,
      asOfDate,
    });
    return result.items;
  }
}

// TODO(A-07): DbScheduleProvider that maps repo.listInstallments(...) when the table exists (Q3).
