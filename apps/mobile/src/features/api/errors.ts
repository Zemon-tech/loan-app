/**
 * Error taxonomy + friendly, NON-REVEALING user messages.
 *
 * NO raw server strings, status numbers, or `{"error":"code"}` values ever reach the UI or any
 * log. `ApiError`/`AdapterError` carry a `kind` only (plus a status for internal decisioning).
 */

export type ApiErrorKind =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SERVER'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'FORBIDDEN_HTTP'
  | 'NOT_FOUND'
  | 'ADAPTER';

export interface ApiError {
  kind: ApiErrorKind;
  /** HTTP status, for internal decisioning only. Never shown to the user. */
  status?: number;
  /** From a 429 `Retry-After` header, seconds. Internal only. */
  retryAfterSec?: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * Thrown by the pure adapter mappers on a missing/malformed wire field or a bad amount.
 * Carries a `kind` ONLY — never the offending value (no money/PII in the error).
 */
export class AdapterError extends Error {
  readonly kind: string;
  constructor(kind: string) {
    super(`AdapterError: ${kind}`);
    this.name = 'AdapterError';
    this.kind = kind;
  }
}

/**
 * i18n key of a calm, non-technical sentence for an ApiError (the screen shows `t(key)`). Keys,
 * not text, so this module stays pure and the wording follows the user's language.
 */
export function friendlyMessageKey(error: ApiError): string {
  switch (error.kind) {
    case 'NETWORK':
      return 'errors.network';
    case 'TIMEOUT':
      return 'errors.timeout';
    case 'SERVER':
      return 'errors.server';
    case 'RATE_LIMITED':
      return 'errors.rateLimited';
    case 'NOT_FOUND':
      return 'errors.notFound';
    case 'BAD_REQUEST':
      return 'errors.badRequest';
    case 'UNAUTHORIZED':
      return 'errors.unauthorized';
    case 'FORBIDDEN_HTTP':
    case 'ADAPTER':
    default:
      return 'errors.generic';
  }
}
/** True when this error should surface as the `session_expired` query state. */
export function isSessionExpired(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { kind?: unknown }).kind === 'UNAUTHORIZED'
  );
}
