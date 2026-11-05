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

/** Map an ApiError to a calm, non-technical sentence. */
export function friendlyMessage(error: ApiError): string {
  switch (error.kind) {
    case 'NETWORK':
      return 'You appear to be offline. Check your connection and try again.';
    case 'TIMEOUT':
      return 'That took too long. Please try again.';
    case 'SERVER':
      return 'Something went wrong on our side. Please try again in a moment.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a little while and try again.';
    case 'NOT_FOUND':
      return "We couldn't find this loan. Pull to refresh your list.";
    case 'BAD_REQUEST':
      return "That didn't look right. Please check your details and try again.";
    case 'UNAUTHORIZED':
      return 'Your session has ended. Please sign in again.';
    case 'FORBIDDEN_HTTP':
    case 'ADAPTER':
    default:
      return 'Something went wrong. Please try again in a moment.';
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
