/**
 * Public app config endpoint (PRD 10.4 GET /v1/config).
 *
 * Returns lender/support/legal info and computes `updateRequired` from X-App-Version +
 * X-Platform. Values come from env (placeholders in dev). No auth required.
 */

import { Router, type Request, type Response } from 'express';
import type { Env } from '../config/env.js';

/** Compare dotted semver-ish versions: returns true if `version` < `minimum`. */
function isBelow(version: string | undefined, minimum: string): boolean {
  if (!version) return false;
  const toParts = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const a = toParts(version);
  const b = toParts(minimum);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

export function configRouter(env: Env): Router {
  const router = Router();

  router.get('/config', (req: Request, res: Response) => {
    const platform = req.header('x-platform');
    const appVersion = req.header('x-app-version');
    const minForPlatform =
      platform === 'ios' ? env.MIN_APP_VERSION_IOS : env.MIN_APP_VERSION_ANDROID;

    res.json({
      minSupportedVersion: {
        android: env.MIN_APP_VERSION_ANDROID,
        ios: env.MIN_APP_VERSION_IOS,
      },
      updateRequired: isBelow(appVersion, minForPlatform),
      storeUrl: { android: env.STORE_URL_ANDROID, ios: env.STORE_URL_IOS },
      maintenance: env.MAINTENANCE_MODE,
      ...(env.MAINTENANCE_MESSAGE ? { maintenanceMessage: env.MAINTENANCE_MESSAGE } : {}),
      lender: {
        legalName: env.LENDER_LEGAL_NAME,
        rbiRegistrationNo: env.LENDER_RBI_REG_NO,
        registeredAddress: env.LENDER_ADDRESS,
      },
      support: {
        phone: env.SUPPORT_PHONE,
        ...(env.SUPPORT_WHATSAPP ? { whatsapp: env.SUPPORT_WHATSAPP } : {}),
        email: env.SUPPORT_EMAIL,
        hours: env.SUPPORT_HOURS,
      },
      grievanceOfficer: {
        name: env.GRIEVANCE_NAME,
        phone: env.GRIEVANCE_PHONE,
        email: env.GRIEVANCE_EMAIL,
      },
      legal: { privacyPolicyUrl: env.PRIVACY_POLICY_URL, termsUrl: env.TERMS_URL },
      features: { pushNotifications: false, screenSecurity: false },
    });
  });

  return router;
}
