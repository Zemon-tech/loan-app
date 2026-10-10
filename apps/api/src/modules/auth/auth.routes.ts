/**
 * DEMO auth routes (A-04 stubbed for the client demo).
 *
 * ⚠️ NOT SECURE — placeholder. No real OTP, no SMS, no JWT, no sessions table. The purpose is a
 * working end-to-end demo: enter a mobile, "verify", get a token, see loans. Real auth replaces
 * this router in A-04; the contract (same request/response shapes, PRD 10.4) stays identical so
 * the mobile app doesn't change.
 *
 * Behaviour:
 *  - POST /auth/otp/request  → always returns the standard shape (anti-enumeration), encoding
 *    the normalised mobile in the otpRequestId so verify can resolve the customer.
 *  - POST /auth/otp/verify   → accepts ANY otp (demo). Resolves the customer by the mobile from
 *    the otpRequestId via the repository; issues a demo token + returns `me`. If no customer
 *    matches, falls back to the demo customer so the demo always works.
 *  - POST /auth/refresh      → returns a fresh demo token (no rotation in demo).
 *  - POST /auth/logout       → 204 (nothing to revoke in demo).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { AppError, ErrorCode } from '../../lib/errors.js';
import type { LoanRepository } from '../../repositories/LoanRepository.js';
import { FIXTURE_CUSTOMER } from '../../repositories/mock/fixtures.js';
import { toMeDto } from '../loans/mappers.js';
import { issueDemoToken } from './token.js';

const OTP_PREFIX = 'otp_';

/** Encode/decode the mobile inside the otpRequestId (demo only). */
function makeOtpRequestId(mobileE164: string): string {
  return OTP_PREFIX + Buffer.from(mobileE164, 'utf8').toString('base64url');
}
function readMobileFromOtpRequestId(id: string): string | null {
  if (!id.startsWith(OTP_PREFIX)) return null;
  try {
    return Buffer.from(id.slice(OTP_PREFIX.length), 'base64url').toString('utf8') || null;
  } catch {
    return null;
  }
}

/** Normalise an Indian mobile to E.164 (+91XXXXXXXXXX). */
function toE164(mobile: string): string {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  return `+91${digits}`;
}

const requestSchema = z.object({ mobile: z.string().min(10) });
const verifySchema = z.object({
  otpRequestId: z.string().min(1),
  otp: z.string().min(1),
  device: z
    .object({
      platform: z.enum(['ios', 'android']).optional(),
      model: z.string().optional(),
      appVersion: z.string().optional(),
    })
    .optional(),
});

export function authRouter(repo: LoanRepository): Router {
  const router = Router();

  router.post('/auth/otp/request', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mobile } = requestSchema.parse(req.body);
      const mobileE164 = toE164(mobile);
      // Always the same shape whether or not the number is registered (anti-enumeration).
      res.json({
        otpRequestId: makeOtpRequestId(mobileE164),
        expiresInSec: 300,
        resendAfterSec: 30,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { otpRequestId } = verifySchema.parse(req.body);
      const mobileE164 = readMobileFromOtpRequestId(otpRequestId);
      if (!mobileE164) throw new AppError(ErrorCode.AUTH_OTP_EXPIRED);

      // Demo: accept any OTP. Resolve the customer by mobile; fall back to the demo customer
      // so the client demo works no matter what number is entered.
      const matches = await repo.findCustomersByMobile(mobileE164);
      const customer = matches[0] ?? FIXTURE_CUSTOMER;

      res.json({
        accessToken: issueDemoToken(customer.customerId),
        accessTokenExpiresInSec: 900,
        refreshToken: issueDemoToken(customer.customerId),
        refreshTokenExpiresInSec: 2_592_000,
        me: toMeDto(customer),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/refresh', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
      // Demo: the refresh token is itself a demo token encoding the customerId.
      const customerId = Buffer.from(
        refreshToken.replace(/^demo\./, ''),
        'base64url',
      ).toString('utf8');
      if (!customerId) throw new AppError(ErrorCode.AUTH_REFRESH_INVALID);
      res.json({
        accessToken: issueDemoToken(customerId),
        accessTokenExpiresInSec: 900,
        refreshToken: issueDemoToken(customerId),
        refreshTokenExpiresInSec: 2_592_000,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/logout', (_req: Request, res: Response) => {
    res.status(204).send(); // nothing to revoke in demo
  });

  return router;
}
