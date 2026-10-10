/**
 * Auth middleware — resolves the authenticated customerId from the Bearer token and attaches
 * it to the request (PRD 11.3). Every /v1 route except /auth/*, /config, /health uses this.
 *
 * DEMO phase: tokens are the unsigned demo tokens from ./token.ts. In A-04 this middleware's
 * body swaps to verifying a signed JWT + checking the session; the `req.customerId` contract
 * it provides to downstream routes does not change.
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { readDemoToken } from './token.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth from the verified token. */
      customerId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    next(new AppError(ErrorCode.AUTH_UNAUTHORIZED));
    return;
  }
  const customerId = readDemoToken(match[1]!);
  if (!customerId) {
    next(new AppError(ErrorCode.AUTH_UNAUTHORIZED));
    return;
  }
  req.customerId = customerId;
  next();
}

/** Helper for route handlers: get the customerId or throw (should never be missing post-guard). */
export function getCustomerId(req: Request): string {
  if (!req.customerId) throw new AppError(ErrorCode.AUTH_UNAUTHORIZED);
  return req.customerId;
}
