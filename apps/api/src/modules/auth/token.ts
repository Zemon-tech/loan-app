/**
 * DEMO token helpers (A-04 is stubbed for the client demo).
 *
 * ⚠️ NOT SECURE — placeholder only. This issues an opaque, UNSIGNED token that encodes the
 * customerId so the loan endpoints receive a real customerId and enforce per-customer scoping.
 * Real auth (OTP → signed JWT access + rotating refresh in `mobile_app.sessions`) replaces
 * ONLY this file + the verify route in A-04; the middleware seam and all loan code stay put.
 */

const DEMO_PREFIX = 'demo.';

/** Issue a demo access token for a customer. Format: `demo.<base64url(customerId)>`. */
export function issueDemoToken(customerId: string): string {
  return DEMO_PREFIX + Buffer.from(customerId, 'utf8').toString('base64url');
}

/** Resolve a demo token back to its customerId, or null if it isn't a valid demo token. */
export function readDemoToken(token: string): string | null {
  if (!token.startsWith(DEMO_PREFIX)) return null;
  try {
    const customerId = Buffer.from(token.slice(DEMO_PREFIX.length), 'base64url').toString('utf8');
    return customerId.length > 0 ? customerId : null;
  } catch {
    return null;
  }
}
