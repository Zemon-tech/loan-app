/**
 * PROTOTYPE request layer. Simulates latency and failures so every loading / error / offline /
 * session-expired state can be seen without a backend.
 *
 * Set EXPO_PUBLIC_MOCK_NETWORK (then restart the dev server):
 *   ok               normal (default)         loading        skeletons stay on screen
 *   error            first load fails, retry works           offline   offline banner + saved data
 *   session_expired  requests report an expired session
 * EXPO_PUBLIC_MOCK_DELAY_MS controls the simulated latency (default 900, 0 = instant).
 *
 * TODO (F-05 / F-06): replace with TanStack Query against the real API client. Keep the same
 * states: loading -> skeleton, error -> friendly retry, 401 -> session expired.
 */
import { useCallback, useEffect, useState } from 'react';

export type MockNetwork = 'ok' | 'loading' | 'error' | 'offline' | 'session_expired';

export function mockNetwork(): MockNetwork {
  const v = process.env.EXPO_PUBLIC_MOCK_NETWORK;
  return v === 'loading' || v === 'error' || v === 'offline' || v === 'session_expired' ? v : 'ok';
}

function delayMs(): number {
  const n = Number(process.env.EXPO_PUBLIC_MOCK_DELAY_MS);
  return Number.isFinite(n) && process.env.EXPO_PUBLIC_MOCK_DELAY_MS ? n : 900;
}

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'session_expired' }
  | { status: 'success'; data: T };

/** Simple in-memory cache so revisiting a screen is instant (like a query cache). */
const cache = new Map<string, unknown>();

export function useMockQuery<T>(key: string, load: () => T): QueryState<T> & { refetch: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<QueryState<T>>(() =>
    cache.has(key) ? { status: 'success', data: cache.get(key) as T } : { status: 'loading' },
  );

  useEffect(() => {
    if (cache.has(key) && attempt === 0) return;
    const mode = mockNetwork();
    if (mode === 'loading') return;

    const id = setTimeout(() => {
      if (mode === 'session_expired') return setState({ status: 'session_expired' });
      // The first attempt fails; "Try again" then succeeds, so the recovery path is visible.
      if (mode === 'error' && attempt === 0) return setState({ status: 'error' });
      const data = load();
      cache.set(key, data);
      setState({ status: 'success', data });
    }, delayMs());
    return () => clearTimeout(id);
  }, [key, load, attempt]);

  const refetch = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  return { ...state, refetch };
}
