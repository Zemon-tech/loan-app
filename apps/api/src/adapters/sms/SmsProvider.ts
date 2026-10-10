/**
 * SMS provider abstraction for OTP delivery (PRD Q10, A-03).
 *
 * The OTP VALUE must never be logged (PRD 11.1). ConsoleProvider is for local dev only.
 * Msg91Provider is the production implementation; DLT template registration is done by the
 * client. Select via SMS_PROVIDER env.
 */

import type { Env } from '../../config/env.js';
import type { Logger } from '../../lib/logger.js';

export interface SendOtpInput {
  /** E.164 mobile, e.g. "+919876543210". */
  mobileE164: string;
  /** The 6-digit OTP. NEVER log this value. */
  otp: string;
}

export interface SmsProvider {
  readonly name: string;
  sendOtp(input: SendOtpInput): Promise<void>;
}

/** Dev-only provider: prints a masked line, never the OTP, to stdout. */
export class ConsoleProvider implements SmsProvider {
  readonly name = 'console';
  constructor(private readonly logger: Logger) {}

  async sendOtp(input: SendOtpInput): Promise<void> {
    // The OTP is intentionally omitted. In dev with OTP_DEV_MODE the fixed OTP is 123456.
    this.logger.info(
      { provider: this.name, to: maskMobile(input.mobileE164) },
      'OTP send (console provider — value not logged)',
    );
  }
}

/** Production MSG91 provider. TODO(A-04): wire the real MSG91 OTP API + DLT template. */
export class Msg91Provider implements SmsProvider {
  readonly name = 'msg91';
  constructor(
    private readonly cfg: Pick<Env, 'MSG91_AUTH_KEY' | 'MSG91_TEMPLATE_ID' | 'MSG91_SENDER_ID'>,
    private readonly logger: Logger,
  ) {}

  async sendOtp(input: SendOtpInput): Promise<void> {
    // TODO(A-04): POST to MSG91 using this.cfg + the DLT-approved template.
    // The OTP value must be sent to MSG91 only, never logged.
    this.logger.info(
      { provider: this.name, to: maskMobile(input.mobileE164) },
      'OTP send (msg91 provider — not yet implemented)',
    );
    throw new Error('Msg91Provider.sendOtp not implemented (A-04)');
  }
}

/** Mask all but the last 3 digits for safe logging: +91 98XXXXX002. */
function maskMobile(mobileE164: string): string {
  if (mobileE164.length < 5) return 'XXX';
  return `${mobileE164.slice(0, 5)}XXXXX${mobileE164.slice(-3)}`;
}

export function createSmsProvider(env: Env, logger: Logger): SmsProvider {
  return env.SMS_PROVIDER === 'msg91' ? new Msg91Provider(env, logger) : new ConsoleProvider(logger);
}
