/** Indian mobile number helpers for the auth screens. */
import type { ApiErrorKind } from '../api/errors';


/** Valid Indian mobile: 10 digits starting 6-9 (PRD 8.2). */
export const INDIAN_MOBILE = /^[6-9]\d{9}$/;
/**
 * Normalise typed or pasted input to at most 10 national digits.
 * Accepts '+91 98765 43210', '91-98765-43210', '098765 43210', spaces, dashes, letters.
 * A leading '+91' is always dropped; a leading '91' only when 12 digits are present
 * (so a real number starting 91... is not damaged); a leading '0' only when 11 digits are present.
 */
export function normalizeMobile(input: string): string {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+91') || trimmed.startsWith('0091')) {
    digits = digits.slice(trimmed.startsWith('+91') ? 2 : 4);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export type MobileCheck = 'OK' | 'EMPTY' | 'BAD_START' | 'TOO_SHORT';

/** Check normalised digits. BAD_START is reported as soon as the first digit is wrong. */
export function validateMobile(digits: string): MobileCheck {
  if (digits.length === 0) return 'EMPTY';
  if (!/^[6-9]/.test(digits)) return 'BAD_START';
  if (digits.length < 10) return 'TOO_SHORT';
  return INDIAN_MOBILE.test(digits) ? 'OK' : 'BAD_START';
}

/**
 * i18n key of the plain-language message for a failed check (null when OK). Returns a KEY, not
 * text, so this stays pure and the screen translates it with `t(key)`.
 */
export function mobileCheckKey(check: MobileCheck): string | null {
  switch (check) {
    case 'EMPTY':
    case 'TOO_SHORT':
      return 'login.err.enter10';
    case 'BAD_START':
      return 'login.err.startDigit';
    default:
      return null;
  }
}

/** i18n key of the message when requesting the code fails. Never mentions whether the number is registered. */
export function otpRequestErrorKey(kind: ApiErrorKind): string {
  switch (kind) {
    case 'NETWORK':
      return 'login.err.network';
    case 'RATE_LIMITED':
      return 'login.err.rateLimited';
    case 'BAD_REQUEST':
      return 'login.err.badRequest';
    case 'TIMEOUT':
      return 'login.err.timeout';
    default:
      return 'login.err.generic';
  }
}
/** Keep digits only, max 10. */
export function sanitizeMobile(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

/** "9876543210" -> "98765 43210" (grouped for readability while typing). */
export function formatMobileInput(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

/** "+919876543002" -> "+91 98765 43002" (clean formatted display) */
export function formatMobile(mobile: string | null): string {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return mobile;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** "+919876543002" -> "+91 98XXXXX002" */
export function maskMobile(mobile: string | null): string {
  const digits = (mobile ?? '').replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return '+91 XXXXXXXXXX';
  return `+91 ${digits.slice(0, 2)}XXXXX${digits.slice(-3)}`;
}

/** "+919876543002" -> "+91 98•••••002" (unlock screen chip) */
export function maskMobileDots(mobile: string | null): string {
  return maskMobile(mobile).replace(/X/g, '\u2022');
}
/**
 * Pull a one-time code out of pasted text (e.g. what WhatsApp's "Copy code" put on the clipboard).
 * Accepts "123456", "123 456", "123-456" and a short message holding exactly one standalone
 * 6-digit number ("123456 is your verification code"). Returns null for anything else
 * (empty, too short/long, letters mixed in, or several different candidates).
 */
export function extractOtp(text: string | null | undefined, length = 6): string | null {
  if (!text) return null;
  const compact = text.trim().replace(/[\s-]/g, '');
  if (new RegExp(`^\\d{${length}}$`).test(compact)) return compact;
  const found = text.match(new RegExp(`(?<!\\d)\\d{${length}}(?!\\d)`, 'g'));
  if (!found) return null;
  const unique = new Set(found);
  return unique.size === 1 ? found[0] : null;
}