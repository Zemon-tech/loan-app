/**
 * The single TanStack Query v5 client + the network/focus manager wiring (FR-11, AC-10).
 *
 * `retry` never retries RATE_LIMITED/UNAUTHORIZED/BAD_REQUEST/NOT_FOUND/FORBIDDEN_HTTP/ADAPTER
 * (429 is never looped — FR-8) and allows at most ONE retry for NETWORK/TIMEOUT/SERVER.
 *
 * NOTE: TanStack Query devtools are deliberately NOT installed (they would expose cached loan
 * data). Query keys use the opaque loanId only.
 */
import { onlineManager, focusManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import type { ApiError } from './errors';

function errorKind(error: unknown): ApiError['kind'] | undefined {
  if (typeof error === 'object' && error !== null && 'kind' in error) {
    return (error as { kind?: ApiError['kind'] }).kind;
  }
  return undefined;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const kind = errorKind(error);
        if (
          kind === 'RATE_LIMITED' ||
          kind === 'UNAUTHORIZED' ||
          kind === 'BAD_REQUEST' ||
          kind === 'NOT_FOUND' ||
          kind === 'FORBIDDEN_HTTP' ||
          kind === 'ADAPTER'
        ) {
          return false;
        }
        // NETWORK / TIMEOUT / SERVER (or unknown): at most one retry.
        return failureCount < 1;
      },
    },
  },
});

/** Online decision from an expo-network state (prefer reachability, then connectivity). */
function isOnlineFrom(state: Network.NetworkState): boolean {
  return state.isInternetReachable ?? state.isConnected ?? true;
}

let managersWired = false;

/**
 * Wire onlineManager (expo-network) and focusManager (RN AppState) once at startup. Returns a
 * teardown function. Idempotent: a second call is a no-op returning a no-op teardown.
 */
export function setupQueryManagers(): () => void {
  if (managersWired) return () => {};
  managersWired = true;

  const netSub = Network.addNetworkStateListener((state) => {
    onlineManager.setOnline(isOnlineFrom(state));
  });

  // Seed the initial online state (the listener only fires on change).
  Network.getNetworkStateAsync()
    .then((state) => onlineManager.setOnline(isOnlineFrom(state)))
    .catch(() => onlineManager.setOnline(true));

  let appSub: { remove: () => void } | null = null;
  if (Platform.OS !== 'web') {
    appSub = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
  }

  return () => {
    netSub.remove();
    appSub?.remove();
    managersWired = false;
  };
}
