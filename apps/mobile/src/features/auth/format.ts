/** Indian mobile number helpers for the auth screens. */

/** Valid Indian mobile: 10 digits starting 6-9 (PRD 8.2). */
export const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/** Keep digits only, max 10. */
export function sanitizeMobile(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

/** "9876543210" -> "98765 43210" (grouped for readability while typing). */
export function formatMobileInput(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
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
