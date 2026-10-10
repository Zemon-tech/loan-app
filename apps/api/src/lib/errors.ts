/**
 * Typed application error + the catalogue of error codes used across the API.
 *
 * Every failure the API returns to a client is an {@link AppError}. The single error handler
 * (see src/app.ts) serialises it to the wire format defined in PRD Section 10.2:
 *
 *   { "error": { "code", "message", "details?", "requestId" } }
 *
 * Never leak raw DB errors, stack traces, or internal messages to clients. Unknown throwables
 * are mapped to a generic INTERNAL error by the handler.
 */

/** Stable machine-readable error codes (PRD 10.2). Client maps these to i18n messages. */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_INVALID_OTP: 'AUTH_INVALID_OTP',
  AUTH_OTP_EXPIRED: 'AUTH_OTP_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_REFRESH_INVALID: 'AUTH_REFRESH_INVALID',
  AUTH_OTP_ATTEMPTS_EXCEEDED: 'AUTH_OTP_ATTEMPTS_EXCEEDED',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  UPDATE_REQUIRED: 'UPDATE_REQUIRED',
  INTERNAL: 'INTERNAL',
  MAINTENANCE: 'MAINTENANCE',
  UPSTREAM_DB_UNAVAILABLE: 'UPSTREAM_DB_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Default HTTP status per error code (PRD 10.2 table). */
const DEFAULT_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  AUTH_INVALID_OTP: 400,
  AUTH_OTP_EXPIRED: 400,
  AUTH_UNAUTHORIZED: 401,
  AUTH_REFRESH_INVALID: 401,
  AUTH_OTP_ATTEMPTS_EXCEEDED: 403,
  NOT_FOUND: 404,
  UPDATE_REQUIRED: 426,
  AUTH_RATE_LIMITED: 429,
  INTERNAL: 500,
  MAINTENANCE: 503,
  UPSTREAM_DB_UNAVAILABLE: 503,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, details?: Record<string, unknown>, httpStatus?: number) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus ?? DEFAULT_STATUS[code];
    this.details = details;
    // Keep a clean prototype chain for `instanceof` after transpilation.
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static notFound(details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.NOT_FOUND, details);
  }

  static unauthorized(details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.AUTH_UNAUTHORIZED, details);
  }

  static internal(details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.INTERNAL, details);
  }
}

/** Shape serialised to the client. `message` is a safe, generic default per code. */
export interface WireError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

/** Generic, non-sensitive default messages. The mobile app maps `code` to localised copy. */
const SAFE_MESSAGE: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'The request was invalid.',
  AUTH_INVALID_OTP: 'Incorrect OTP.',
  AUTH_OTP_EXPIRED: 'OTP expired. Request a new one.',
  AUTH_UNAUTHORIZED: 'Authentication required.',
  AUTH_REFRESH_INVALID: 'Session is no longer valid.',
  AUTH_OTP_ATTEMPTS_EXCEEDED: 'Too many attempts. Try again later.',
  AUTH_RATE_LIMITED: 'Too many requests. Try again later.',
  NOT_FOUND: 'Not found.',
  UPDATE_REQUIRED: 'Please update the app to continue.',
  INTERNAL: 'Something went wrong.',
  MAINTENANCE: 'Service is temporarily unavailable.',
  UPSTREAM_DB_UNAVAILABLE: 'Service is temporarily unavailable.',
};

export function toWireError(err: AppError, requestId: string): WireError {
  return {
    error: {
      code: err.code,
      message: SAFE_MESSAGE[err.code],
      ...(err.details ? { details: err.details } : {}),
      requestId,
    },
  };
}
