/**
 * Central error handling (PRD 10.2, 21 "Errors").
 *
 *  - notFoundHandler: terminal 404 for unmatched routes.
 *  - errorHandler: the single 4-arg Express error middleware. Serialises AppError to the wire
 *    format; maps zod errors to VALIDATION_ERROR; maps everything else to a generic INTERNAL
 *    (never leaking stack traces or DB messages). Express 5 forwards async errors here
 *    automatically.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode, toWireError } from './errors.js';
import type { Logger } from './logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound({ path: req.path }));
}

export function createErrorHandler(logger: Logger) {
  // Must keep all four parameters — Express identifies error middleware by arity.
  return function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    const requestId = req.requestId ?? 'unknown';

    let appErr: AppError;
    if (err instanceof AppError) {
      appErr = err;
    } else if (err instanceof ZodError) {
      appErr = new AppError(ErrorCode.VALIDATION_ERROR, {
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    } else {
      appErr = AppError.internal();
    }

    // Log safe fields only; 5xx logged at error, others at warn/info. Never log the raw error
    // body/PII — pino redaction (logger.ts) is a backstop.
    const logPayload = {
      requestId,
      route: req.originalUrl,
      method: req.method,
      status: appErr.httpStatus,
      code: appErr.code,
    };
    if (appErr.httpStatus >= 500) {
      logger.error({ ...logPayload, err: appErr.message }, 'request failed');
    } else {
      logger.warn(logPayload, 'request rejected');
    }

    if (appErr.code === ErrorCode.AUTH_RATE_LIMITED && typeof appErr.details?.retryAfterSec === 'number') {
      res.setHeader('Retry-After', String(appErr.details.retryAfterSec));
    }

    res.status(appErr.httpStatus).json(toWireError(appErr, requestId));
  };
}
