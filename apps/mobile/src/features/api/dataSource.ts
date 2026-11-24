/**
 * Data-source seam the screens call (FR-12, AC-14). Picks live (TanStack + client + adapter)
 * vs mock (the retained useMockQuery + placeholderData, converted to the SAME VMs via the mock
 * adapter) by apiMode(). Both branches return the four-state union, so loans.tsx and
 * loan/[loanId]/index.tsx keep their existing `status` switch.
 */
import { useCallback } from 'react';

import type { Paise } from '@app/shared';

import { apiMode } from './config';
import { isSessionExpired } from './errors';
import {
  mockLoanToDetailVM,
  mockLoanToListItemVM,
  mockLoanTransactionsToPageVM,
} from './mockAdapter';
import {
  toQueryState,
  useInfiniteTransactionsQuery,
  useLoanQuery,
  useLoansQuery,
  usePhotoQuery,
  useProfileQuery,
} from './queries';
import type {
  BorrowerProfileVM,
  LoanDetailVM,
  LoanListItemVM,
  QueryState,
  TransactionsPageVM,
  TransactionVM,
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
      phone: PLACEHOLDER_CUSTOMER.mobile,
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

export interface InfiniteTransactionsDataState {
  status: 'loading' | 'success' | 'error' | 'session_expired';
  data: {
    transactions: TransactionVM[];
    totalCreditPaise: Paise;
    totalDebitPaise: Paise;
    totalCount: number;
    totalPages: number;
  } | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: () => void;
  isRefreshing: boolean;
}

export function useTransactionsData(loanId: string): InfiniteTransactionsDataState {
  const live = apiMode() === 'live';
  const liveQuery = useInfiniteTransactionsQuery(loanId);

  const loadMock = useCallback((): TransactionsPageVM | null => {
    const loan = findPlaceholderLoan(loanId);
    return loan ? mockLoanTransactionsToPageVM(loan) : null;
  }, [loanId]);
  const mockQuery = useMockQuery<TransactionsPageVM | null>(`transactions:vm:${loanId}`, loadMock);

  if (live) {
    let status: InfiniteTransactionsDataState['status'] = 'loading';
    if (liveQuery.isError) {
      status = isSessionExpired(liveQuery.error) ? 'session_expired' : 'error';
    } else if (liveQuery.data !== undefined) {
      status = 'success';
    }

    const pages = liveQuery.data?.pages ?? [];
    const firstPage = pages[0];
    const transactions = pages.flatMap((p) => p.transactions);

    const data = firstPage
      ? {
          transactions,
          totalCreditPaise: firstPage.totalCreditPaise,
          totalDebitPaise: firstPage.totalDebitPaise,
          totalCount: firstPage.totalCount,
          totalPages: firstPage.totalPages,
        }
      : null;

    return {
      status,
      data,
      fetchNextPage: () => {
        void liveQuery.fetchNextPage();
      },
      hasNextPage: Boolean(liveQuery.hasNextPage),
      isFetchingNextPage: Boolean(liveQuery.isFetchingNextPage),
      refetch: () => {
        void liveQuery.refetch();
      },
      isRefreshing: liveQuery.isRefetching && !liveQuery.isFetchingNextPage,
    };
  }

  const mockData = mockQuery.status === 'success' ? mockQuery.data : null;
  return {
    status: mockQuery.status,
    data: mockData
      ? {
          transactions: mockData.transactions,
          totalCreditPaise: mockData.totalCreditPaise,
          totalDebitPaise: mockData.totalDebitPaise,
          totalCount: mockData.totalCount,
          totalPages: mockData.totalPages,
        }
      : null,
    fetchNextPage: () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: mockQuery.refetch,
    isRefreshing: false,
  };
}
