/**
 * Single-flight refresh lock (FR-7, FR-0h) — the critical auth path.
 *
 * A module-level in-flight promise guarantees that N concurrent 401s await ONE refresh network
 * call (JS is single-threaded, so the check-and-set of `inFlight` is atomic). On success the
 * NEW refresh token is saved FIRST, then the new access token is set (single-use tokens: save
 * the new one before using it). On any failure both tokens are cleared.
 *
 * `fetchRefresh` is injectable so the concurrency property is unit-testable in isolation. The
 * production implementation lives in client.ts and POSTs /api/v1/auth/token/refresh, BYPASSING
 * the single-flight client wrapper (a refresh that itself 401s is a hard failure, never a
 * nested refresh).
 */
import { clearTokens, saveTokens } from './tokenStore';

export interface RefreshTokens {
  accessToken: string;
  refreshToken: string;
}

/** Resolves with the raw new token pair, or throws on any failure (non-2xx/network/missing). */
export type FetchRefresh = () => Promise<RefreshTokens>;

export interface RefreshOutcome {
  ok: boolean;
}

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * Run (or join) the single shared refresh. Returns `{ ok: true }` when a new token pair was
 * saved, `{ ok: false }` when refresh failed (tokens cleared).
 */
export function refreshOnce(fetchRefresh: FetchRefresh): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<RefreshOutcome> => {
    try {
      const tokens = await fetchRefresh();
      // Save the NEW refresh token first, then the access token.
      await saveTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return { ok: true };
    } catch {
      await clearTokens();
      return { ok: false };
    }
  })();

  // Clear the lock once settled so a later, legitimate refresh can run.
  inFlight.finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Test-only: reset the in-flight lock between cases. */
export function __resetRefreshForTests(): void {
  inFlight = null;
}
