/**
 * Express application assembly (PRD 7.2, 13, 15.1).
 *
 * Builds and returns the app with middleware wired in the correct order:
 *   security headers → request context → body parser (small limit) → logging →
 *   rate limiting → routes → 404 → error handler.
 *
 * The app is pure (no listen, no process side effects) so tests can import it with supertest.
 */

import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Pool } from 'mysql2/promise';
import type { Knex } from 'knex';

import type { Env } from './config/env.js';
import type { Logger } from './lib/logger.js';
import { requestContext } from './lib/requestContext.js';
import { createErrorHandler, notFoundHandler } from './lib/errorHandler.js';
import { globalLimiter, authLimiter } from './lib/rateLimit.js';
import { healthRouter } from './modules/health.js';
import { configRouter } from './modules/config.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { loansRouter } from './modules/loans/loans.routes.js';
import { createLoanRepository } from './repositories/index.js';

export interface AppDeps {
  env: Env;
  logger: Logger;
  clientPool: Pool;
  appDb: Knex;
}

/** Max request body (PRD 13: 10 KB). */
const BODY_LIMIT = '10kb';

export function createApp(deps: AppDeps): Express {
  const { env, logger, clientPool, appDb } = deps;
  const app = express();

  // Behind a reverse proxy/ALB in production — trust it for correct client IPs (rate limiting).
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
  app.disable('x-powered-by');

  // 1. Security headers (PRD 15.1 S6). CORS is intentionally NOT enabled (PRD 13).
  app.use(helmet());

  // 2. Request id + no-store cache header.
  app.use(requestContext);

  // 3. Body parsing with a strict size cap.
  app.use(express.json({ limit: BODY_LIMIT }));

  // 4. Request logging (safe fields only; pino redaction configured in logger.ts).
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId,
      // Do not auto-log headers/body (may contain PII); keep the summary minimal.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // 5. Global rate limiting (PRD 15.1 S4).
  app.use(globalLimiter);

  // Loan data source (mock for the demo; swappable via DATA_SOURCE — BACKEND_SPEC §5.2).
  const loanRepo = createLoanRepository(env, logger);

  // 6. Routes, all under /v1.
  const v1 = express.Router();
  v1.use(healthRouter({ clientPool, appDb }));
  v1.use(configRouter(env));
  // Auth endpoints: stricter rate limit, scoped to /auth only (⚠️ DEMO stub — real OTP/JWT A-04).
  v1.use('/auth', authLimiter);
  v1.use(authRouter(loanRepo));
  // Authenticated loan + me endpoints. In demo (mock) mode, pin "today" to the fixture date
  // so the designed scenario renders deterministically (DEMO_AS_OF_DATE).
  const asOfOverride = env.DATA_SOURCE === 'mock' ? env.DEMO_AS_OF_DATE : undefined;
  v1.use(loansRouter(loanRepo, asOfOverride));
  // TODO: devicesRouter, DELETE /me (A-09 remainder, Phase 2).
  app.use('/v1', v1);

  // 7. 404 + central error handler (must be last).
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
