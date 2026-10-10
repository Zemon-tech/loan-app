/**
 * Request-id middleware (PRD 10.1). The client sends X-Request-Id (UUID); the API echoes it
 * and attaches it to the request for logging and error responses. A fresh id is generated
 * when absent.
 */

import type { Request, Response, NextFunction } from 'express';
import { newRequestId } from './ids.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlation id for this request (echoed as X-Request-Id). */
      requestId: string;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 100 ? incoming : newRequestId();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  // All authenticated routes must not be cached (PRD 13).
  res.setHeader('Cache-Control', 'no-store');
  next();
}
