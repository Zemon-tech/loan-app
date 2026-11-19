/**
 * Data-source seam the screens call (FR-12, AC-14). Picks live (TanStack + client + adapter)
 * vs mock (the retained useMockQuery + placeholderData, converted to the SAME VMs via the mock
 * adapter) by apiMode(). Both branches return the four-state union, so loans.tsx and
 * loan/[loanId]/index.tsx keep their existing `status` switch.
 */
import { useCallback } from 'react';

import { apiMode } from './config';
import {
  mockLoanToDetailVM,
  mockLoanToListItemVM,
  mockLoanTransactionsToPageVM,
} from './mockAdapter';
import {
  toQueryState,
  useLoanQuery,
  useLoansQuery,
  usePhotoQuery,
  useProfileQuery,
  useTransactionsQuery,
} from './queries';
import type {
  BorrowerProfileVM,
  LoanDetailVM,
  LoanListItemVM,
  QueryState,
  TransactionsPageVM,
} from './vm';
import {
  findPlaceholderLoan,
  PLACEHOLDER_CUSTOMER,
  PLACEHOLDER_LOANS,
} from '@/features/loans/placeholderData';
import { useMockQuery } from '@/features/system/mockQuery';

export type DataState<T> = QueryState<T> & { refetch: () => void };

export function useLoansData(): DataState<LoanListItemVM[]> {
  const live = apiMode() === 'live';

  // Both hooks are always called (hooks rules); only the matching branch's result is returned.
  const liveQuery = useLoansQuery();

  const loadMock = useCallback(() => PLACEHOLDER_LOANS.map(mockLoanToListItemVM), []);
  const mockQuery = useMockQuery('loans:vm', loadMock);

  if (live) return toQueryState(liveQuery);
  return mockQuery;
}

export function useLoanData(loanId: string): DataState<LoanDetailVM | null> {
  const live = apiMode() === 'live';

  const liveQuery = useLoanQuery(loanId);

  // Mock: a missing loan resolves to `null` (success) so the screen shows "loan not found",
  // mirroring the prototype's behaviour; live mode gets a NOT_FOUND error state from the 404.
  const loadMock = useCallback(
    (): LoanDetailVM | null => {
      const loan = findPlaceholderLoan(loanId);
      return loan ? mockLoanToDetailVM(loan) : null;
    },
    [loanId],
  );
  const mockQuery = useMockQuery<LoanDetailVM | null>(`loan:vm:${loanId}`, loadMock);

  if (live) return toQueryState(liveQuery);
  return mockQuery;
}

export function useProfileData(): DataState<BorrowerProfileVM> {
  const live = apiMode() === 'live';
  const liveQuery = useProfileQuery();

  const loadMock = useCallback(
    (): BorrowerProfileVM => ({
      name: PLACEHOLDER_CUSTOMER.name,
      hasPhoto: false,
      initials: PLACEHOLDER_CUSTOMER.initials,
    }),
    [],
  );
  const mockQuery = useMockQuery<BorrowerProfileVM>('profile:vm', loadMock);

  if (live) return toQueryState(liveQuery);
  return mockQuery;
}

export function usePhotoData(hasPhoto = true): DataState<string | null> {
  const live = apiMode() === 'live';
  const liveQuery = usePhotoQuery(hasPhoto);

  const loadMock = useCallback((): string | null => null, []);
  const mockQuery = useMockQuery<string | null>('photo:vm', loadMock);

  if (live) return toQueryState(liveQuery);
  return mockQuery;
}

export function useTransactionsData(loanId: string, page = 1): DataState<TransactionsPageVM | null> {
  const live = apiMode() === 'live';
  const liveQuery = useTransactionsQuery(loanId, page);

  const loadMock = useCallback((): TransactionsPageVM | null => {
    const loan = findPlaceholderLoan(loanId);
    return loan ? mockLoanTransactionsToPageVM(loan) : null;
  }, [loanId]);
  const mockQuery = useMockQuery<TransactionsPageVM | null>(`transactions:vm:${loanId}:${page}`, loadMock);

  if (live) return toQueryState(liveQuery);
  return mockQuery;
}
