/**
 * End-to-end demo flow via supertest: login (dummy) → /me → /loans → /loans/:id → /schedule →
 * /transactions, plus auth rejection and cross-customer 404. Runs against the mock repository
 * (DATA_SOURCE=mock); no DB needed for these routes.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { Pool } from 'mysql2/promise';
import type { Knex } from 'knex';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { loadEnv } from '../src/config/env.js';
import { issueDemoToken } from '../src/modules/auth/token.js';

const TEST_ENV = {
  NODE_ENV: 'test',
  DATA_SOURCE: 'mock',
  DEMO_AS_OF_DATE: '2026-09-19',
  CLIENT_DB_HOST: 'localhost', CLIENT_DB_USER: 'app_ro', CLIENT_DB_NAME: 'client_db',
  APP_DB_HOST: 'localhost', APP_DB_USER: 'app_rw', APP_DB_NAME: 'mobile_app',
  JWT_ACCESS_SECRET: 'x'.repeat(32), OTP_HMAC_SECRET: 'y'.repeat(32),
} satisfies NodeJS.ProcessEnv;

let app: Express;

beforeAll(() => {
  const env = loadEnv(TEST_ENV);
  const logger = createLogger({ LOG_LEVEL: 'silent' as never, NODE_ENV: 'test' });
  app = createApp({ env, logger, clientPool: {} as Pool, appDb: {} as Knex });
});

async function login(mobile = '9999900001'): Promise<{ token: string; me: Record<string, unknown> }> {
  const r1 = await request(app).post('/v1/auth/otp/request').send({ mobile });
  expect(r1.status).toBe(200);
  const r2 = await request(app)
    .post('/v1/auth/otp/verify')
    .send({ otpRequestId: r1.body.otpRequestId, otp: '123456' });
  expect(r2.status).toBe(200);
  return { token: r2.body.accessToken, me: r2.body.me };
}

describe('demo auth flow', () => {
  it('otp request returns the standard shape', async () => {
    const res = await request(app).post('/v1/auth/otp/request').send({ mobile: '9999900001' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('otpRequestId');
    expect(res.body.expiresInSec).toBe(300);
  });

  it('verify returns a token and the demo customer', async () => {
    const { token, me } = await login();
    expect(token).toMatch(/^demo\./);
    expect(me.customerId).toBe('cu_demo1');
    expect(me.mobile).toBe('+919999900001');
  });
});

describe('protected routes require a valid token', () => {
  it('rejects missing token with 401', async () => {
    const res = await request(app).get('/v1/loans');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
  });
  it('rejects garbage token with 401', async () => {
    const res = await request(app).get('/v1/loans').set('Authorization', 'Bearer nonsense');
    expect(res.status).toBe(401);
  });
});

describe('loan endpoints (authenticated)', () => {
  it('GET /me', async () => {
    const { token } = await login();
    const res = await request(app).get('/v1/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.customerId).toBe('cu_demo1');
  });

  it('GET /loans returns both loans + totals (active/overdue only)', async () => {
    const { token } = await login();
    const res = await request(app).get('/v1/loans').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.loans).toHaveLength(2);
    const a = res.body.loans.find((l: { accountNumber: string }) => l.accountNumber === 'A00001');
    expect(a.status).toBe('OVERDUE');
    expect(a.outstandingPaise).toBe(9_416_700);
    // totals exclude the CLOSED loan B
    expect(res.body.totals.outstandingPaise).toBe(9_416_700);
  });

  it('GET /loans/:id detail satisfies the outstanding invariant', async () => {
    const { token } = await login();
    const res = await request(app).get('/v1/loans/ln_demo_a').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const f = res.body.financials;
    expect(f.outstandingPaise).toBe(
      f.payablePaise + f.lateFeePaise + f.overdueInterestPaise + f.recoveryChargesPaise - f.discountPaise - f.adjustedPaise - f.totalPaidPaise,
    );
    expect(res.body.paymentBreakup.onlinePaidPaise + res.body.paymentBreakup.cashPaidPaise).toBe(3_900_000);
  });

  it('GET /schedule returns 100 installments with matching summary', async () => {
    const { token } = await login();
    const res = await request(app).get('/v1/loans/ln_demo_a/schedule').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(100);
    const s = res.body.summary;
    expect(s.paid + s.partial + s.overdue + s.dueToday + s.upcoming).toBe(100);
    // Golden scenario as of 2026-09-19 (PRD 12.4): 32 paid, 1 partial(#33), 62 overdue(#34-95),
    // 1 due today(#96), 4 upcoming(#97-100).
    expect(s).toMatchObject({ paid: 32, partial: 1, overdue: 62, dueToday: 1, upcoming: 4 });
  });

  it('GET /transactions pages via cursor', async () => {
    const { token } = await login();
    const p1 = await request(app).get('/v1/loans/ln_demo_a/transactions?limit=20').set('Authorization', `Bearer ${token}`);
    expect(p1.status).toBe(200);
    expect(p1.body.items.length).toBe(20);
    expect(p1.body.nextCursor).toBeTruthy();
    const p2 = await request(app)
      .get(`/v1/loans/ln_demo_a/transactions?limit=20&cursor=${encodeURIComponent(p1.body.nextCursor)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(p2.status).toBe(200);
    const ids1 = new Set(p1.body.items.map((t: { id: string }) => t.id));
    for (const t of p2.body.items) expect(ids1.has(t.id)).toBe(false); // no overlap
  });

  it('returns 404 for a loan the customer does not own (no 403, PRD 10.2)', async () => {
    // A token for a different customer id who owns nothing.
    const otherToken = issueDemoToken('cu_other');
    const res = await request(app).get('/v1/loans/ln_demo_a').set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
