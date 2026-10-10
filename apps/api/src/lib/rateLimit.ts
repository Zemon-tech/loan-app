/**
 * Rate limiting (PRD 15.1 S4). A global per-IP limit on all routes, plus a stricter limiter
 * for auth endpoints. Keyed by IP by default; data endpoints add per-customer limits once auth
 * is wired (A-04). Uses express-rate-limit v8 (`limit`, draft-8 standard headers).
 *
 * NOTE: the in-memory store is per-process. For multi-instance deployments, swap in a shared
 * store (e.g. Redis) — tracked for the deployment phase.
 */

import { rateLimit } from 'express-rate-limit';
import { AppError, ErrorCode } from './errors.js';

const RATE_LIMITED = () =>
  new AppError(ErrorCode.AUTH_RATE_LIMITED, { retryAfterSec: 60 });

/** Global: 120 requests/min per IP (PRD S4). */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(RATE_LIMITED()),
});

/** Auth: tighter window for OTP/verify/refresh (PRD 11.1). */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(RATE_LIMITED()),
});
