/**
 * Health endpoints (PRD 10.4).
 *   GET /v1/health        — liveness; always 200 if the process is up.
 *   GET /v1/health/ready  — readiness; checks client DB + app DB connectivity.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Pool } from 'mysql2/promise';
import type { Knex } from 'knex';
import { pingClientDb } from '../db/clientDb.js';
import { pingAppDb } from '../db/appDb.js';

export interface HealthDeps {
  clientPool: Pool;
  appDb: Knex;
}

export function healthRouter(deps: HealthDeps): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  router.get('/health/ready', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.all([pingClientDb(deps.clientPool), pingAppDb(deps.appDb)]);
      res.json({ status: 'ready', time: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
