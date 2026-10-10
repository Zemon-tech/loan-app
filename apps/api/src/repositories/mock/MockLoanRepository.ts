/**
 * In-memory LoanRepository backed by fixtures (PRD 14.2, task A-05). Used for the demo and in
 * tests. Enforces the same contract as any real implementation:
 *  - every loan-scoped method filters by customerId (PRD A3); cross-customer access -> null
 *  - returns internal *Record types only (DTO whitelisting happens above, PRD A4)
 *
 * Transactions are returned newest-first with opaque cursor paging (PRD 10.4).
 */

import { compareIsoDate } from '@app/shared';
import type {
  CustomerRecord,
  LoanChargesRecord,
  LoanRecord,
  LoanRepository,
  Page,
  TransactionRecord,
} from '../LoanRepository.js';
import { FIXTURE_CUSTOMER, FIXTURE_LOANS, FIXTURE_OWNERSHIP } from './fixtures.js';

/** Normalise a mobile to the last-10-digit form for matching (PRD 14.2 mapping rule). */
function last10(mobile: string): string {
  return mobile.replace(/\D/g, '').slice(-10);
}

/** Encode/decode an opaque cursor over (date, id). Base64url of `date|id`. */
function encodeCursor(date: string, id: string): string {
  return Buffer.from(`${date}|${id}`, 'utf8').toString('base64url');
}
function decodeCursor(cursor: string): { date: string; id: string } | null {
  try {
    const [date, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (!date || !id) return null;
    return { date, id };
  } catch {
    return null;
  }
}

/** Newest-first ordering: date desc, then id desc (PRD 13 deterministic ordering). */
function byNewest(a: TransactionRecord, b: TransactionRecord): number {
  const d = compareIsoDate(b.date, a.date);
  return d !== 0 ? d : (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
}

export class MockLoanRepository implements LoanRepository {
  async findCustomersByMobile(mobileE164: string): Promise<CustomerRecord[]> {
    return last10(mobileE164) === last10(FIXTURE_CUSTOMER.mobileE164) ? [FIXTURE_CUSTOMER] : [];
  }

  async getCustomer(customerId: string): Promise<CustomerRecord | null> {
    return customerId === FIXTURE_CUSTOMER.customerId ? FIXTURE_CUSTOMER : null;
  }

  private ownsLoan(customerId: string, loanId: string): boolean {
    return (FIXTURE_OWNERSHIP[customerId] ?? []).includes(loanId);
  }

  async listLoans(customerId: string): Promise<LoanRecord[]> {
    const ids = FIXTURE_OWNERSHIP[customerId] ?? [];
    return ids.map((id) => FIXTURE_LOANS[id]!.loan);
  }

  async getLoan(customerId: string, loanId: string): Promise<LoanRecord | null> {
    if (!this.ownsLoan(customerId, loanId)) return null; // cross-customer -> 404 upstream
    return FIXTURE_LOANS[loanId]!.loan;
  }

  async getLoanCharges(customerId: string, loanId: string): Promise<LoanChargesRecord> {
    if (!this.ownsLoan(customerId, loanId)) {
      // Scoping guard: never return another customer's charges.
      return { lateFeePaise: 0, overdueInterestPaise: 0, recoveryChargesPaise: 0, discountPaise: 0, adjustedPaise: 0 };
    }
    return FIXTURE_LOANS[loanId]!.charges;
  }

  async listTransactions(
    customerId: string,
    loanId: string,
    page: { cursor?: string; limit: number },
  ): Promise<Page<TransactionRecord>> {
    if (!this.ownsLoan(customerId, loanId)) return { items: [], nextCursor: null };

    const all = [...FIXTURE_LOANS[loanId]!.transactions].sort(byNewest);

    let startIndex = 0;
    if (page.cursor) {
      const decoded = decodeCursor(page.cursor);
      if (decoded) {
        // Resume strictly after the (date,id) in the cursor.
        const idx = all.findIndex((t) => t.date === decoded.date && t.id === decoded.id);
        startIndex = idx >= 0 ? idx + 1 : 0;
      }
    }

    const slice = all.slice(startIndex, startIndex + page.limit);
    const last = slice[slice.length - 1];
    const hasMore = startIndex + page.limit < all.length;
    return {
      items: slice,
      nextCursor: hasMore && last ? encodeCursor(last.date, last.id) : null,
    };
  }

  async sumPayments(
    customerId: string,
    loanId: string,
  ): Promise<{ onlinePaise: number; cashPaise: number; totalPaise: number }> {
    if (!this.ownsLoan(customerId, loanId)) return { onlinePaise: 0, cashPaise: 0, totalPaise: 0 };
    const txns = FIXTURE_LOANS[loanId]!.transactions;
    let onlinePaise = 0;
    let cashPaise = 0;
    for (const t of txns) {
      if (t.type !== 'PAYMENT') continue;
      if (t.mode === 'ONLINE') onlinePaise += t.amountPaise;
      else if (t.mode === 'CASH') cashPaise += t.amountPaise;
    }
    return { onlinePaise, cashPaise, totalPaise: onlinePaise + cashPaise };
  }
}
