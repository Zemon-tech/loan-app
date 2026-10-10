/**
 * Loans service (A-08). Orchestrates repository + shared schedule calculator + whitelist
 * mappers into the response DTOs. No HTTP here; routes call these. Every method takes the
 * authenticated customerId and passes it through to the repository (per-customer scoping, A3).
 */

import { todayIST, type IsoDate, type IsoDateTime } from '@app/shared';
import type {
  LoanDetail,
  LoansResponse,
  Me,
  ScheduleResponse,
  TransactionsResponse,
} from '@app/shared';
import { AppError, ErrorCode } from '../../lib/errors.js';
import type { LoanRepository } from '../../repositories/LoanRepository.js';
import {
  deriveSchedule,
  toLastPayment,
  toLoanDetailDto,
  toLoanSummaryDto,
  toMeDto,
  toScheduleResponse,
  toTransactionDto,
} from './mappers.js';

/** Server read time as an IST-offset ISO timestamp for the `asOf` field. */
function nowAsOf(): IsoDateTime {
  // IST is +05:30; present the current instant with that offset.
  const d = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
  return d.toISOString().replace('Z', '+05:30');
}

export class LoansService {
  /**
   * @param repo loan data source
   * @param asOfOverride DEMO only: pin "today" to a fixed IST date (BACKEND_SPEC demo mode).
   *                     When undefined, uses the real IST today.
   */
  constructor(
    private readonly repo: LoanRepository,
    private readonly asOfOverride?: IsoDate,
  ) {}

  private asOfDate(): IsoDate {
    return this.asOfOverride ?? todayIST();
  }

  async getMe(customerId: string): Promise<Me> {
    const customer = await this.repo.getCustomer(customerId);
    if (!customer) throw new AppError(ErrorCode.NOT_FOUND);
    return toMeDto(customer);
  }

  async listLoans(customerId: string): Promise<LoansResponse> {
    const loans = await this.repo.listLoans(customerId);
    const today = this.asOfDate();

    const summaries = await Promise.all(
      loans.map(async (loan) => {
        const [charges, txnPage] = await Promise.all([
          this.repo.getLoanCharges(customerId, loan.loanId),
          this.repo.listTransactions(customerId, loan.loanId, { limit: 1 }),
        ]);
        const sched = deriveSchedule(loan, today);
        const lastPayment = toLastPayment(txnPage.items);
        return toLoanSummaryDto(loan, charges, sched, lastPayment);
      }),
    );

    // totals cover ACTIVE and OVERDUE loans only (PRD 10.4).
    const totals = summaries.reduce(
      (acc, s) => {
        if (s.status !== 'CLOSED') {
          acc.outstandingPaise += s.outstandingPaise;
          acc.overdueInstallmentsPaise += s.overdueInstallmentsPaise;
        }
        return acc;
      },
      { outstandingPaise: 0, overdueInstallmentsPaise: 0 },
    );

    return { asOf: nowAsOf(), totals, loans: summaries };
  }

  async getLoanDetail(customerId: string, loanId: string): Promise<LoanDetail> {
    const loan = await this.repo.getLoan(customerId, loanId);
    if (!loan) throw new AppError(ErrorCode.NOT_FOUND); // also covers cross-customer (never 403)

    const [charges, payments, lastTxn] = await Promise.all([
      this.repo.getLoanCharges(customerId, loanId),
      this.repo.sumPayments(customerId, loanId),
      this.repo.listTransactions(customerId, loanId, { limit: 1 }),
    ]);
    const sched = deriveSchedule(loan, this.asOfDate());
    const lastPayment = toLastPayment(lastTxn.items);

    return toLoanDetailDto(
      loan,
      charges,
      sched,
      { onlinePaise: payments.onlinePaise, cashPaise: payments.cashPaise },
      lastPayment,
      nowAsOf(),
    );
  }

  async getSchedule(customerId: string, loanId: string): Promise<ScheduleResponse> {
    const loan = await this.repo.getLoan(customerId, loanId);
    if (!loan) throw new AppError(ErrorCode.NOT_FOUND);
    const sched = deriveSchedule(loan, this.asOfDate());
    return toScheduleResponse(sched, nowAsOf());
  }

  async getTransactions(
    customerId: string,
    loanId: string,
    page: { cursor?: string; limit: number },
  ): Promise<TransactionsResponse> {
    // Confirm ownership first so a bad loanId returns 404, not an empty list.
    const loan = await this.repo.getLoan(customerId, loanId);
    if (!loan) throw new AppError(ErrorCode.NOT_FOUND);

    const result = await this.repo.listTransactions(customerId, loanId, page);
    return { items: result.items.map(toTransactionDto), nextCursor: result.nextCursor };
  }
}
