/**
 * API mode + base URL resolution.
 *
 * `baseUrl()` validates the base URL as an ORIGIN-ONLY https value and throws at construction
 * (fail fast) in live mode if it is not. Every request concatenates the full `/api/v1/...` path
 * onto the origin, so a base URL that already carries a path (e.g. the old `.../v1` default)
 * would silently misroute and regress toward the forbidden `/v1`.
 */

export type ApiMode = 'mock' | 'live';

const DEFAULT_BASE_URL = 'https://online.alangcredits.com';

export function apiMode(): ApiMode {
  return process.env.EXPO_PUBLIC_API_MODE === 'live' ? 'live' : 'mock';
}

/**
 * The API origin (scheme + host, no trailing slash, no path). Request paths carry the full
 * `/api/v1` prefix. In live mode a non-https or path-carrying URL throws at startup.
 */
export function baseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;
  const u = new URL(raw);
  if (u.protocol !== 'https:') {
    throw new Error('API base URL must be https');
  }
  if (u.pathname !== '/' && u.pathname !== '') {
    throw new Error('API base URL must be origin-only (no path segment)');
  }
  return `${u.protocol}//${u.host}`;
}
