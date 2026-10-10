/**
 * Server entrypoint (PRD 15.1 S2/S10, 19.5).
 *
 * Boot sequence:
 *   1. Load + validate env (fail fast on invalid/unsafe config).
 *   2. Create DB connections (client read-only pool, app-owned Knex).
 *   3. Run startup guards (client DB must be read-only).
 *   4. Build the app and listen.
 *   5. Graceful shutdown on SIGINT/SIGTERM.
 */

import { createServer } from 'node:http';
import { loadEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createClientPool, assertClientReadOnly } from './db/clientDb.js';
import { createAppDb } from './db/appDb.js';
import { createApp } from './app.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);

  const clientPool = createClientPool(env);
  const appDb = createAppDb(env);

  // Startup guard (PRD 15.1 S10). In production a write-capable client user is fatal; in
  // dev/test it is a warning so local setups aren't blocked.
  try {
    await assertClientReadOnly(clientPool, logger, env.NODE_ENV === 'production');
  } catch (err) {
    logger.fatal({ err: (err as Error).message }, 'client DB read-only guard failed');
    await shutdownResources();
    process.exit(1);
  }

  const app = createApp({ env, logger, clientPool, appDb });
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
  });

  async function shutdownResources(): Promise<void> {
    await Promise.allSettled([clientPool.end(), appDb.destroy()]);
  }

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void shutdownResources().then(() => process.exit(0));
    });
    // Hard cap so a hung connection can't block forever.
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  // Logger may not exist yet if env failed; use console as a last resort.
  // eslint-disable-next-line no-console
  console.error('Fatal boot error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
