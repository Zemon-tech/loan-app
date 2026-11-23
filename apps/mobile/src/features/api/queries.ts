/**
 * TanStack Query hooks for the live path + the four-state wrapper + an online hook.
 *
 * The screens switch on `status: loading | error | session_expired | success` (the prototype's
 * four states). `toQueryState` maps a TanStack result back to that union so the screens change
 * minimally. A failed query whose error is UNAUTHORIZED surfaces as `session_expired`.
 */
import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import * as Network from 'expo-network';

import { apiMode } from './config';
import { getLoan, getLoans, getPhoto, getProfile, getTransactions } from './endpoints';
import { isSessionExpired } from './errors';
import type {
  BorrowerProfileVM,
  LoanDetailVM,
  LoanListItemVM,
  QueryState,
  TransactionsPageVM,
} from './vm';

export const loanKeys = {
  all: ['loans'] as const,
  detail: (loanId: string) => ['loan', loanId] as const,
  transactions: (loanId: string, page: number | string) => ['loan', loanId, 'transactions', page] as const,
};

export const profileKeys = {
  me: ['profile', 'me'] as const,
  photo: ['profile', 'photo'] as const,
};

/** Throw the ApiError so TanStack treats the query as failed and `retry`/state logic can read it. */
async function unwrapLoans(): Promise<LoanListItemVM[]> {
  const res = await getLoans();
  if (res.ok) return res.data;
  throw res.error;
}

async function unwrapLoan(loanId: string): Promise<LoanDetailVM> {
  const res = await getLoan(loanId);
  if (res.ok) return res.data;
  throw res.error;
}

async function unwrapProfile(): Promise<BorrowerProfileVM> {
  const res = await getProfile();
  if (res.ok) return res.data;
  throw res.error;
}

async function unwrapPhoto(): Promise<string | null> {
  const res = await getPhoto();
  if (res.ok) return res.data;
  throw res.error;
}

async function unwrapTransactions(loanId: string, page: number): Promise<TransactionsPageVM> {
  const res = await getTransactions(loanId, page);
  if (res.ok) return res.data;
  throw res.error;
}

/**
 * The data-source seam always calls these hooks (rules of hooks), so they must be inert in mock
 * mode: no network request may ever leave the app when `EXPO_PUBLIC_API_MODE=mock`.
 */
const isLive = () => apiMode() === 'live';

export function useLoansQuery(): UseQueryResult<LoanListItemVM[]> {
  return useQuery({ queryKey: loanKeys.all, queryFn: unwrapLoans, enabled: isLive() });
}

export function useLoanQuery(loanId: string): UseQueryResult<LoanDetailVM> {
  return useQuery({
    queryKey: loanKeys.detail(loanId),
    queryFn: () => unwrapLoan(loanId),
    enabled: isLive() && loanId.length > 0,
  });
}

export function useProfileQuery(): UseQueryResult<BorrowerProfileVM> {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: unwrapProfile,
    enabled: isLive(),
  });
}

export function usePhotoQuery(hasPhoto = true): UseQueryResult<string | null> {
  return useQuery({
    queryKey: profileKeys.photo,
    queryFn: unwrapPhoto,
    enabled: isLive() && hasPhoto,
    staleTime: 60 * 60 * 1000, // 1 hour per API guide
  });
}

export function useTransactionsQuery(
  loanId: string,
  page = 1,
): UseQueryResult<TransactionsPageVM> {
  return useQuery({
    queryKey: loanKeys.transactions(loanId, page),
    queryFn: () => unwrapTransactions(loanId, page),
    enabled: isLive() && loanId.length > 0,
  });
}

export function useInfiniteTransactionsQuery(
  loanId: string,
): UseInfiniteQueryResult<InfiniteData<TransactionsPageVM, number>, Error> {
  return useInfiniteQuery({
    queryKey: loanKeys.transactions(loanId, 'infinite'),
    queryFn: ({ pageParam = 1 }) => unwrapTransactions(loanId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: isLive() && loanId.length > 0,
  });
}

export interface QueryStateWithRefetch<T> {
  status: QueryState<T>['status'];
  data?: T;
  refetch: () => void;
}

/** Map a TanStack result to the prototype's four-state union (+ refetch). */
export function toQueryState<T>(
  q: UseQueryResult<T>,
): QueryState<T> & { refetch: () => void } {
  const refetch = () => {
    void q.refetch();
  };
  if (q.data !== undefined && !q.isError) {
    return { status: 'success', data: q.data, refetch };
  }
  if (q.isError && isSessionExpired(q.error)) {
    return { status: 'session_expired', refetch };
  }
  if (q.isError) {
    return { status: 'error', refetch };
  }
  return { status: 'loading', refetch };
}

export type { QueryKey };

/**
 * Live-mode connectivity hook, backed by the SAME expo-network source that feeds onlineManager.
 * online = isInternetReachable ?? isConnected ?? true.
 */
export function useIsOnline(): boolean {
  const state = Network.useNetworkState();
  return state.isInternetReachable ?? state.isConnected ?? true;
}
