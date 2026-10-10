/**
 * ID and token helpers. Uses Node's crypto (no external dep).
 */

import { randomUUID, randomBytes } from 'node:crypto';

/** A fresh request id (UUID v4) when the client did not supply X-Request-Id. */
export function newRequestId(): string {
  return randomUUID();
}

/** Opaque prefixed id, e.g. `otp_8f2c...` (PRD uses opaque ids on the wire). */
export function newOpaqueId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('hex')}`;
}

/** 256-bit random opaque token (hex). Used for refresh tokens (PRD 11.2). */
export function newRefreshToken(): string {
  return randomBytes(32).toString('hex');
}
