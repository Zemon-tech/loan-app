/**
 * A-05/A-06 tests: MockLoanRepository scoping + DTO mappers + invariants + blacklist scan.
 */
import { describe, it, expect } from 'vitest';
import { MockLoanRepository } from '../src/repositories/mock/MockLoanRepository.js';
import {
  FIXTURE_CUSTOMER,
  FIXTURE_AS_OF_DATE,
  LOAN_A,
  LOAN_B,
  LOAN_A_TRANSACTIONS,
  LOAN_B_TRANSACTIONS,
} from '../src/repositories/mock/fixtures.js';
import {
  deriveSchedule,
  toLoanSummaryDto,
  toLoanDetailDto,
  toScheduleResponse,
  toTransactionDto,
  toMeDto,
  toLastPayment,
} from '../src/modules/loans/mappers.js';
import { findBlacklistedKeys } from '../src/lib/blacklist.js';

const repo = new MockLoanRepository();
const CU = FIXTURE_CUSTOMER.customerId;

describe('MockLoanRepository — per-customer scoping (PRD A3)', () => {
  it('finds the demo customer by mobile (various formats)', async () => {
    expect((await repo.findCustomersByMobile('+919999900001'))[0]?.customerId).toBe(CU);
    expect((await repo.findCustomersByMobile('9999900001'))[0]?.customerId).toBe(CU);
    expect((await repo.findCustomersByMobile('09999900001'))[0]?.customerId).toBe(CU);
    expect(await repo.findCustomersByMobile('+919000000000')).toEqual([]);
  });

  it('lists exactly the demo customer loans', async () => {
    const loans = await repo.listLoans(CU);
    expect(loans.map((l) => l.loanId).sort()).toEqual(['ln_demo_a', 'ln_demo_b']);
  });

  it('returns null for a loan the customer does not own', async () => {
    expect(await repo.getLoan('cu_other', 'ln_demo_a')).toBeNull();
    expect(await repo.getLoan(CU, 'ln_does_not_exist' as string)).toBeUndefined;
  });

  it('does not leak another customer transactions or charges', async () => {
    const page = await repo.listTransactions('cu_other', 'ln_demo_a', { limit: 20 });
    expect(page.items).toEqual([]);
    const sums = await repo.sumPayments('cu_other', 'ln_demo_a');
    expect(sums.totalPaise).toBe(0);
  });
});

describe('Fixtures sum exactly to the paid totals (PRD Appendix C)', () => {
  it('loan A payments sum to 3,900,000 paise and include the ₹5,000 on 2026-09-11', () => {
    const total = LOAN_A_TRANSACTIONS.reduce((s, t) => s + t.amountPaise, 0);
    expect(total).toBe(LOAN_A.totalInstallmentPaidPaise);
    expect(total).toBe(3_900_000);
    expect(LOAN_A_TRANSACTIONS).toContainEqual(
      expect.objectContaining({ date: '2026-09-11', amountPaise: 500_000, mode: 'ONLINE' }),
    );
    expect(LOAN_A_TRANSACTIONS.length).toBeGreaterThanOrEqual(40);
  });

  it('loan B payments sum to 5,600,000 paise (= payable, fully paid)', () => {
    const total = LOAN_B_TRANSACTIONS.reduce((s, t) => s + t.amountPaise, 0);
    expect(total).toBe(LOAN_B.totalInstallmentPaidPaise);
    expect(total).toBe(5_600_000);
  });
});

describe('Mappers + golden numbers (PRD 12.4, 10.4)', () => {
  it('loan A summary matches the golden expectations', () => {
    const sched = deriveSchedule(LOAN_A, FIXTURE_AS_OF_DATE);
    const summary = toLoanSummaryDto(LOAN_A, {
      lateFeePaise: 0, overdueInterestPaise: 1_316_700, recoveryChargesPaise: 0, discountPaise: 0, adjustedPaise: 0,
    }, sched, null);

    expect(summary.status).toBe('OVERDUE');
    expect(summary.installmentsPaid).toBe(32);
    expect(summary.installmentsRemaining).toBe(68);
    expect(summary.overdueInstallmentsPaise).toBe(7_500_000);
    expect(summary.overdueInstallmentsCount).toBe(63);
    expect(summary.nextDue).toEqual({ date: '2026-09-19', amountPaise: 120_000, isToday: true });
    expect(summary.maturityDate).toBe('2026-09-23');
    // outstanding = payable(12,000,000) + overdueInterest(1,316,700) - paid(3,900,000)
    expect(summary.outstandingPaise).toBe(9_416_700);
  });

  it('outstanding invariant holds (PRD 10.4)', () => {
    const sched = deriveSchedule(LOAN_A, FIXTURE_AS_OF_DATE);
    const detail = toLoanDetailDto(
      LOAN_A,
      { lateFeePaise: 0, overdueInterestPaise: 1_316_700, recoveryChargesPaise: 0, discountPaise: 0, adjustedPaise: 0 },
      sched,
      { onlinePaise: 3_900_000, cashPaise: 0 },
      null,
      '2026-09-19T10:30:00+05:30',
    );
    const f = detail.financials;
    expect(f.outstandingPaise).toBe(
      f.payablePaise + f.lateFeePaise + f.overdueInterestPaise + f.recoveryChargesPaise - f.discountPaise - f.adjustedPaise - f.totalPaidPaise,
    );
    expect(detail.installmentsPaid + detail.installmentsRemaining).toBe(detail.totalInstallments);
  });

  it('loan B derives as CLOSED', () => {
    const sched = deriveSchedule(LOAN_B, FIXTURE_AS_OF_DATE);
    expect(sched.status).toBe('CLOSED');
    expect(sched.nextDue).toBeNull();
  });

  it('schedule response summary counts add up to total', () => {
    const sched = deriveSchedule(LOAN_A, FIXTURE_AS_OF_DATE);
    const resp = toScheduleResponse(sched, '2026-09-19T10:30:00+05:30');
    const s = resp.summary;
    expect(s.paid + s.partial + s.overdue + s.dueToday + s.upcoming).toBe(s.total);
    expect(s.total).toBe(100);
  });
});

describe('Transaction paging (PRD 10.4)', () => {
  it('pages newest-first via cursor without duplicates or gaps', async () => {
    const seen = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    let prevDate = '9999-99-99';
    do {
      const page = await repo.listTransactions(CU, 'ln_demo_a', { cursor, limit: 20 });
      for (const t of page.items) {
        expect(seen.has(t.id)).toBe(false); // no duplicates
        seen.add(t.id);
        expect(t.date <= prevDate).toBe(true); // newest-first
        prevDate = t.date;
      }
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor && pages < 20);
    expect(seen.size).toBe(LOAN_A_TRANSACTIONS.length);
  });
});

describe('Blacklist contract (PRD Appendix B, A-06)', () => {
  it('no mapper output contains a blacklisted key', async () => {
    const sched = deriveSchedule(LOAN_A, FIXTURE_AS_OF_DATE);
    const charges = { lateFeePaise: 0, overdueInterestPaise: 1_316_700, recoveryChargesPaise: 0, discountPaise: 0, adjustedPaise: 0 };
    const page = await repo.listTransactions(CU, 'ln_demo_a', { limit: 50 });

    const payloads = {
      me: toMeDto(FIXTURE_CUSTOMER),
      summary: toLoanSummaryDto(LOAN_A, charges, sched, toLastPayment(page.items)),
      detail: toLoanDetailDto(LOAN_A, charges, sched, { onlinePaise: 3_900_000, cashPaise: 0 }, null, '2026-09-19T10:30:00+05:30'),
      schedule: toScheduleResponse(sched, '2026-09-19T10:30:00+05:30'),
      transactions: page.items.map(toTransactionDto),
    };

    for (const [name, payload] of Object.entries(payloads)) {
      const hits = findBlacklistedKeys(payload);
      expect(hits, `blacklisted keys in ${name}: ${JSON.stringify(hits)}`).toEqual([]);
    }
  });

  it('the scanner actually catches a planted blacklisted key', () => {
    const hits = findBlacklistedKeys({ ok: 1, agentName: 'x', nested: [{ guarantorPhone: 'y' }] });
    expect(hits.map((h) => h.key).sort()).toEqual(['agentName', 'guarantorPhone']);
  });
});
