/**
 * Single-flight refresh lock (FR-7, FR-0h) — the critical auth path.
 *
 * A module-level in-flight promise guarantees that N concurrent 401s await ONE refresh network
 * call (JS is single-threaded, so the check-and-set of `inFlight` is atomic). On success the
 * NEW refresh token is saved FIRST, then the new access token is set (single-use tokens: save
 * the new one before using it). On a definite rejection both tokens are cleared; on a transient failure they are kept.
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

/**
 * Why a refresh failed. ejected = the server (or an absent token) says the session is over
 * -> tokens are cleared and the user must sign in again. 	ransient = network / timeout / 5xx /
 * 429 -> the session is NOT proven dead, so tokens are kept and the caller may retry later.
 */
export type RefreshFailure = 'rejected' | 'transient';

export class RefreshError extends Error {
  readonly failure: RefreshFailure;
  constructor(failure: RefreshFailure) {
    super(`RefreshError: ${failure}`);
    this.name = 'RefreshError';
    this.failure = failure;
  }
}

export type RefreshOutcome = { ok: true } | { ok: false; reason: RefreshFailure };

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * Run (or join) the single shared refresh. Returns `{ ok: true }` when a new token pair was
 * saved, otherwise `{ ok: false, reason }` (tokens cleared only for `rejected`).
 */
export function refreshOnce(fetchRefresh: FetchRefresh): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<RefreshOutcome> => {
    try {
      const tokens = await fetchRefresh();
      // Save the NEW refresh token first, then the access token.
      await saveTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return { ok: true };
    } catch (e) {
      // Only a definite rejection ends the session. Anything else (offline, timeout, 5xx)
      // keeps the stored refresh token so the next attempt can still succeed.
      if (e instanceof RefreshError && e.failure === 'transient') {
        return { ok: false, reason: 'transient' };
      }
      await clearTokens();
      return { ok: false, reason: 'rejected' };
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
