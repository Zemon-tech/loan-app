/**
 * App-owned DB — READ/WRITE access to the `mobile_app` schema via Knex (PRD 6.2, 14.4).
 *
 * Holds OTP records, sessions, devices, deletion requests, and the audit log. Separate user
 * and schema from the client DB. Migrations live in src/db/migrations.
 */

import knex, { type Knex } from 'knex';
import type { Env } from '../config/env.js';
import { AppError, ErrorCode } from '../lib/errors.js';

export function createAppDb(env: Env): Knex {
  return knex({
    client: 'mysql2',
    connection: {
      host: env.APP_DB_HOST,
      port: env.APP_DB_PORT,
      user: env.APP_DB_USER,
      password: env.APP_DB_PASSWORD,
      database: env.APP_DB_NAME,
    },
    pool: { min: 2, max: 10 },
    acquireConnectionTimeout: 10_000,
  });
}

/** Connectivity probe for /health/ready. */
export async function pingAppDb(db: Knex): Promise<void> {
  try {
    await db.raw('SELECT 1');
  } catch {
    throw new AppError(ErrorCode.UPSTREAM_DB_UNAVAILABLE);
  }
}
