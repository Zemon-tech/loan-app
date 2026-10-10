/**
 * Environment configuration, validated at boot with zod (PRD 19.3, 15.1 S2/S10).
 *
 * The process MUST fail fast if required secrets are missing or unsafe. Boot guards:
 *  - refuse to start in production with OTP_DEV_MODE=true
 *  - refuse to start if JWT/OTP secrets are shorter than 32 bytes
 * (The client-DB write-privilege guard runs against a live connection in db/clientDb.ts.)
 */

import { z } from 'zod';

const nonEmpty = z.string().min(1);
/** Secrets must be at least 32 bytes (PRD 11.2, 15.1 S10). */
const secret32 = z.string().min(32, 'must be at least 32 characters (32 bytes)');

const booleanish = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .or(z.boolean());

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // Which LoanRepository backs loan data (BACKEND_SPEC §5.2). Demo = mock.
    DATA_SOURCE: z.enum(['mock', 'client_api', 'mysql']).default('mock'),

    // DEMO ONLY: pin "today" to a fixed IST date so the fixture scenario (golden test as of
    // 2026-09-19) renders deterministically regardless of the real clock. Unset => real today.
    DEMO_AS_OF_DATE: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
      .optional(),

    // Client DB (READ-ONLY MySQL user)
    CLIENT_DB_HOST: nonEmpty,
    CLIENT_DB_PORT: z.coerce.number().int().positive().default(3306),
    CLIENT_DB_USER: nonEmpty,
    CLIENT_DB_PASSWORD: z.string().default(''),
    CLIENT_DB_NAME: nonEmpty,

    // App-owned schema (READ/WRITE MySQL user)
    APP_DB_HOST: nonEmpty,
    APP_DB_PORT: z.coerce.number().int().positive().default(3306),
    APP_DB_USER: nonEmpty,
    APP_DB_PASSWORD: z.string().default(''),
    APP_DB_NAME: nonEmpty,

    // Migrator credential (DDL on mobile_app). Used ONLY by the migrate step, never the
    // running server. Falls back to APP_DB_USER/PASSWORD if unset (dev convenience).
    APP_DB_MIGRATOR_USER: z.string().optional(),
    APP_DB_MIGRATOR_PASSWORD: z.string().optional(),

    // Auth
    JWT_ACCESS_SECRET: secret32,
    JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
    OTP_HMAC_SECRET: secret32,
    OTP_TTL_SEC: z.coerce.number().int().positive().default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
    OTP_DEV_MODE: booleanish.default(false),

    // SMS
    SMS_PROVIDER: z.enum(['msg91', 'console']).default('console'),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_TEMPLATE_ID: z.string().optional(),
    MSG91_SENDER_ID: z.string().optional(),

    // App config / store
    MIN_APP_VERSION_ANDROID: z.string().default('1.0.0'),
    MIN_APP_VERSION_IOS: z.string().default('1.0.0'),
    STORE_URL_ANDROID: z.string().default(''),
    STORE_URL_IOS: z.string().default(''),
    MAINTENANCE_MODE: booleanish.default(false),
    MAINTENANCE_MESSAGE: z.string().optional(),

    // Lender / support / grievance (surfaced via /config)
    LENDER_LEGAL_NAME: z.string().default(''),
    LENDER_RBI_REG_NO: z.string().default(''),
    LENDER_ADDRESS: z.string().default(''),
    SUPPORT_PHONE: z.string().default(''),
    SUPPORT_WHATSAPP: z.string().optional(),
    SUPPORT_EMAIL: z.string().default(''),
    SUPPORT_HOURS: z.string().default(''),
    GRIEVANCE_NAME: z.string().default(''),
    GRIEVANCE_PHONE: z.string().default(''),
    GRIEVANCE_EMAIL: z.string().default(''),
    PRIVACY_POLICY_URL: z.string().default(''),
    TERMS_URL: z.string().default(''),

    // Monitoring
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Boot guard (PRD 15.1 S10): dev OTP must never be enabled in production.
    if (env.NODE_ENV === 'production' && env.OTP_DEV_MODE) {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_DEV_MODE'],
        message: 'OTP_DEV_MODE must be false in production.',
      });
    }
    // If MSG91 is selected, its credentials are required.
    if (env.SMS_PROVIDER === 'msg91') {
      for (const key of ['MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID', 'MSG91_SENDER_ID'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when SMS_PROVIDER=msg91.`,
          });
        }
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse and validate `process.env`. Throws (fail-fast) with a readable summary if invalid.
 * Call once at boot; pass the result down explicitly (no global singletons).
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
