/**
 * Structured logger (pino). NO PII, NO financial values, NO tokens/OTPs (PRD 15.1 S8).
 *
 * Only safe fields are ever logged: request id, route, status, latency, and an OPAQUE
 * customer id. Mobile numbers, names, amounts, OTPs and tokens must never reach the logs.
 */

import pino from 'pino';
import type { Env } from '../config/env.js';

export type Logger = pino.Logger;

export function createLogger(env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: env.LOG_LEVEL,
    // Pretty transport only in dev; production emits structured JSON for log aggregation.
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino/file', options: { destination: 1 } } }
      : {}),
    // Defensive redaction in case a field slips through. These keys are never logged on purpose.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'otp',
        'mobile',
        'refreshToken',
        'accessToken',
        '*.otp',
        '*.mobile',
        '*.refreshToken',
        '*.accessToken',
      ],
      remove: true,
    },
  });
}
