/**
 * Client DB connection — READ-ONLY MySQL pool (PRD 14.1).
 *
 * This is the client's existing database (loans, transactions). The app uses a user with
 * SELECT-only privileges. All access goes through repositories (never SQL elsewhere), every
 * query is parameterised, and every query filters by the authenticated customerId (PRD A2/A3).
 *
 * Boot guard (PRD 15.1 S10): on startup we check `SHOW GRANTS` for the configured user and
 * refuse to boot (configurable) if it has any write/DDL privilege.
 */

import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import type { Env } from '../config/env.js';
import type { Logger } from '../lib/logger.js';
import { AppError, ErrorCode } from '../lib/errors.js';

const POOL_LIMIT = 10;
const CONNECT_TIMEOUT_MS = 10_000;

export function createClientPool(env: Env): Pool {
  return mysql.createPool({
    host: env.CLIENT_DB_HOST,
    port: env.CLIENT_DB_PORT,
    user: env.CLIENT_DB_USER,
    password: env.CLIENT_DB_PASSWORD,
    database: env.CLIENT_DB_NAME,
    connectionLimit: POOL_LIMIT,
    waitForConnections: true,
    enableKeepAlive: true,
    connectTimeout: CONNECT_TIMEOUT_MS,
    // Return DECIMAL/BIGINT as strings so we can convert to integer paise safely (no float).
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    namedPlaceholders: true,
  });
}

/** Privileges that must NOT be present on the read-only client user. */
const WRITE_PRIVILEGES = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'ALL PRIVILEGES',
];

/**
 * Verify the client DB user is read-only. If `failOnWrite` is true, throws on violation;
 * otherwise logs a warning (PRD 15.1 S10 — configurable).
 */
export async function assertClientReadOnly(
  pool: Pool,
  logger: Logger,
  failOnWrite: boolean,
): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>('SHOW GRANTS');
  const grants = rows
    .map((r) => String(Object.values(r)[0] ?? ''))
    .join('\n')
    .toUpperCase();

  const offending = WRITE_PRIVILEGES.filter((priv) => grants.includes(`GRANT ${priv}`) || grants.includes(`, ${priv}`) || grants.includes(` ${priv},`) || grants.includes(` ${priv} ON`));

  if (offending.length > 0) {
    const msg = `Client DB user has write privileges (${offending.join(', ')}); it MUST be read-only.`;
    if (failOnWrite) {
      throw new Error(msg);
    }
    logger.warn({ offending }, 'client DB user is not strictly read-only');
  }
}

/** Lightweight connectivity probe for /health/ready. Maps failures to UPSTREAM_DB_UNAVAILABLE. */
export async function pingClientDb(pool: Pool): Promise<void> {
  try {
    await pool.query('SELECT 1');
  } catch {
    throw new AppError(ErrorCode.UPSTREAM_DB_UNAVAILABLE);
  }
}
