/**
 * Typed fetch client (FR-6, FR-10, AC-6).
 *
 *   - Builds the URL from baseUrl() + the full `/api/v1/...` path; re-asserts https at call time.
 *   - JSON content-type/accept; injects `Authorization: Bearer <accessToken>` when `auth`.
 *   - 15s AbortController timeout so a hung socket becomes a typed TIMEOUT.
 *   - Reads the body text once, then parses JSON DEFENSIVELY (never throws out of the client).
 *   - Classifies by HTTP STATUS, not body shape.
 *   - On 401 + `Token-Expired: true` + auth + not already a retry -> single-flight refresh, then
 *     retry the original request EXACTLY ONCE. Any other 401 -> UNAUTHORIZED, plus
 *     emitSessionExpired only if a bearer token was actually sent (a token-less request proves
 *     nothing about the session).
 *   - 429 is NEVER auto-retried here (carries Retry-After); 400/403/404/5xx/network/timeout mapped.
 *
 * NO sensitive logging anywhere: no tokens, OTPs, mobile numbers, DOB, loan fields, URLs, or
 * bodies are ever logged. Errors carry a `kind` (+ status for internal decisioning) only.
 */
import { baseUrl } from './config';
import { getDeviceId } from './deviceId';
import type { ApiError, ApiResult } from './errors';
import { RefreshError, refreshOnce, type RefreshTokens } from './refresh';
import { emitSessionExpired } from './sessionEvents';
import { getAccessToken, loadRefreshToken } from './tokenStore';
import type { AuthSuccess } from './wireTypes';

const TIMEOUT_MS = 15_000;

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Inject the bearer access token and enable refresh-on-401. */
  auth?: boolean;
  /** Internal: set on the single automatic retry after a successful refresh. */
  _isRetry?: boolean;
}

function fail(kind: ApiError['kind'], status?: number, retryAfterSec?: number): ApiResult<never> {
  return { ok: false, error: { kind, status, retryAfterSec } };
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/** Perform a request and return a typed result. Never throws for an expected failure. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const origin = baseUrl();
  const url = `${origin}${path}`;
  if (!url.startsWith('https:')) return fail('FORBIDDEN_HTTP');

  // Cold start: the access token is memory-only, so an authed request with none (and a stored
  // refresh token) must refresh FIRST. Single-flight, so concurrent queries share one refresh.
  if (opts.auth && !getAccessToken()) {
    const outcome = await refreshOnce(fetchRefreshTokens);
    if (!outcome.ok) {
      if (outcome.reason === 'rejected') {
        emitSessionExpired();
        return fail('UNAUTHORIZED', 401);
      }
      return fail('NETWORK'); // session not proven dead: let the user retry
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  let sentToken = false;
  if (opts.auth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      sentToken = true;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    // AbortError (timeout) vs a genuine network failure.
    if (e instanceof Error && e.name === 'AbortError') return fail('TIMEOUT');
    return fail('NETWORK');
  }
  clearTimeout(timer);

  // Read + defensively parse the body (status is authoritative regardless).
  let body: unknown;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }

  const status = res.status;

  if (status >= 200 && status < 300) {
    return { ok: true, data: body as T };
  }

  if (status === 401) {
    const tokenExpired = (res.headers.get('Token-Expired') ?? '').toLowerCase() === 'true';
    if (opts.auth && tokenExpired && !opts._isRetry) {
      const outcome = await refreshOnce(fetchRefreshTokens);
      if (!outcome.ok) {
        if (outcome.reason === 'rejected') {
          emitSessionExpired();
          return fail('UNAUTHORIZED', status);
        }
        return fail('NETWORK'); // refresh could not complete (offline / 5xx): keep the session
      }
      return request<T>(path, { ...opts, _isRetry: true }); // retry EXACTLY once
    }
    // Any other 401 (retry already attempted, token rejected). Only end the session when a token
    // was actually sent: a request that went out with no token says nothing about the session.
    if (opts.auth && sentToken) emitSessionExpired();
    return fail('UNAUTHORIZED', status);
  }

  if (status === 400) return fail('BAD_REQUEST', status);
  if (status === 403) return fail('FORBIDDEN_HTTP', status);
  if (status === 404) return fail('NOT_FOUND', status);
  if (status === 429) return fail('RATE_LIMITED', status, parseRetryAfter(res.headers.get('Retry-After')));
  if (status >= 500) return fail('SERVER', status);
  return fail('SERVER', status);
}

/**
 * The production refresh fetcher injected into the single-flight lock. POSTs the refresh
 * endpoint DIRECTLY (not via request()) so its own 401 is a hard failure, never a nested
 * refresh. Throws on any non-2xx / network / missing-token so refreshOnce() clears tokens.
 */
export async function fetchRefreshTokens(): Promise<RefreshTokens> {
  const refreshToken = await loadRefreshToken();
  if (!refreshToken) throw new RefreshError('rejected'); // nothing to refresh with
  const deviceId = await getDeviceId();

  const origin = baseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${origin}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken, deviceId }),
      signal: controller.signal,
    });
  } catch {
    throw new RefreshError('transient'); // offline / timeout
  } finally {
    clearTimeout(timer);
  }

  if (res.status < 200 || res.status >= 300) {
    // 4xx (except 429) = the server refused this refresh token -> session over.
    // 429 / 5xx = transient; keep the token and retry later.
    const definite = res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408;
    throw new RefreshError(definite ? 'rejected' : 'transient');
  }

  let body: unknown;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : undefined;
  } catch {
    throw new RefreshError('transient');
  }

  const auth = body as Partial<AuthSuccess> | undefined;
  if (!auth || auth.status !== 'authenticated' || !auth.accessToken || !auth.refreshToken) {
    throw new RefreshError('transient');
  }
  return { accessToken: auth.accessToken, refreshToken: auth.refreshToken };
}
