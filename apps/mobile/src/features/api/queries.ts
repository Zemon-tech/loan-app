/**
 * TanStack Query hooks for the live path + the four-state wrapper + an online hook.
 *
 * The screens switch on `status: loading | error | session_expired | success` (the prototype's
 * four states). `toQueryState` maps a TanStack result back to that union so the screens change
 * minimally. A failed query whose error is UNAUTHORIZED surfaces as `session_expired`.
 */
import {
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from '@tanstack/react-query';
import * as Network from 'expo-network';

import { getLoan, getLoans } from './endpoints';
import { isSessionExpired } from './errors';
import type { LoanDetailVM, LoanListItemVM, QueryState } from './vm';

export const loanKeys = {
  all: ['loans'] as const,
  detail: (loanId: string) => ['loan', loanId] as const,
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

export function useLoansQuery(): UseQueryResult<LoanListItemVM[]> {
  return useQuery({ queryKey: loanKeys.all, queryFn: unwrapLoans });
}

export function useLoanQuery(loanId: string): UseQueryResult<LoanDetailVM> {
  return useQuery({
    queryKey: loanKeys.detail(loanId),
    queryFn: () => unwrapLoan(loanId),
    enabled: loanId.length > 0,
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
