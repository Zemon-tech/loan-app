/**
 * Smoke tests for the app skeleton: health liveness, config, 404 shape, request-id echo.
 * No real DB is needed — the readiness probe is not exercised here (covered by integration
 * tests in A-10 against docker MySQL).
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import type { Knex } from 'knex';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { loadEnv } from '../src/config/env.js';

const TEST_ENV = {
  NODE_ENV: 'test',
  CLIENT_DB_HOST: 'localhost',
  CLIENT_DB_USER: 'app_ro',
  CLIENT_DB_NAME: 'client_db',
  APP_DB_HOST: 'localhost',
  APP_DB_USER: 'app_rw',
  APP_DB_NAME: 'mobile_app',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  OTP_HMAC_SECRET: 'y'.repeat(32),
} satisfies NodeJS.ProcessEnv;

function makeApp() {
  const env = loadEnv(TEST_ENV);
  const logger = createLogger({ LOG_LEVEL: 'silent' as never, NODE_ENV: 'test' });
  // The skeleton smoke tests never touch the DB handles, so lightweight stubs are fine.
  const clientPool = {} as Pool;
  const appDb = {} as Knex;
  return createApp({ env, logger, clientPool, appDb });
}

describe('app skeleton', () => {
  it('GET /v1/health returns ok', async () => {
    const res = await request(makeApp()).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.time).toBe('string');
  });

  it('echoes the X-Request-Id header', async () => {
    const res = await request(makeApp()).get('/v1/health').set('X-Request-Id', 'test-req-123');
    expect(res.headers['x-request-id']).toBe('test-req-123');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /v1/config returns lender + feature flags', async () => {
    const res = await request(makeApp()).get('/v1/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lender');
    expect(res.body).toHaveProperty('features');
    expect(res.body.updateRequired).toBe(false);
  });

  it('computes updateRequired from X-App-Version', async () => {
    const res = await request(makeApp())
      .get('/v1/config')
      .set('X-Platform', 'android')
      .set('X-App-Version', '0.9.0');
    expect(res.body.updateRequired).toBe(true);
  });

  it('unknown route returns the NOT_FOUND wire error', async () => {
    const res = await request(makeApp()).get('/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error).toHaveProperty('requestId');
  });

  it('does not expose x-powered-by', async () => {
    const res = await request(makeApp()).get('/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
