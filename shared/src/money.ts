/**
 * Money helpers. All money in this app is INTEGER PAISE (₹1 = 100 paise).
 * No floating-point money anywhere (PRD 10.1). Never use parseFloat/toFixed on money.
 */

export type Paise = number; // integer

/** Rupee sign. */
export const RUPEE = '₹';

/**
 * True if the value is a safe integer (the only valid representation of paise).
 */
export function isValidPaise(value: number): boolean {
  return Number.isSafeInteger(value);
}

/**
 * Assert that a value is integer paise, throwing otherwise. Use at trust boundaries
 * (e.g. when converting DB decimals) so float money can never leak in.
 */
export function assertPaise(value: number, label = 'amount'): Paise {
  if (!isValidPaise(value)) {
    throw new TypeError(`${label} must be integer paise, received: ${value}`);
  }
  return value;
}

/**
 * Convert a rupee amount (possibly with up to 2 decimal places) to integer paise,
 * rounding half up. For converting DB decimal columns at the repository boundary.
 * Accepts a number or a numeric string.
 *
 *   rupeesToPaise('1200')    -> 120000
 *   rupeesToPaise(1200.5)    -> 120050
 *   rupeesToPaise('1,200')   -> 120000  (commas stripped)
 */
export function rupeesToPaise(rupees: number | string): Paise {
  const n = typeof rupees === 'string' ? Number(rupees.replace(/,/g, '').trim()) : rupees;
  if (!Number.isFinite(n)) {
    throw new TypeError(`Invalid rupee amount: ${String(rupees)}`);
  }
  // Round half up on the paise, guarding against binary FP error (e.g. 1200.005).
  return Math.round((n + Number.EPSILON) * 100);
}

/** Whole rupees contained in a paise amount (floored toward zero). */
export function paiseToWholeRupees(paise: Paise): number {
  return Math.trunc(assertPaise(paise) / 100);
}

/**
 * Group an integer with the Indian numbering system (…,##,##,###).
 *   123       -> "123"
 *   1234      -> "1,234"
 *   133167    -> "1,33,167"
 *   10000000  -> "1,00,00,000"
 */
export function groupIndian(intValue: number): string {
  const negative = intValue < 0;
  const digits = Math.abs(Math.trunc(intValue)).toString();

  let grouped: string;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    // Group the remaining digits in pairs from the right.
    const pairs = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${pairs},${last3}`;
  }
  return negative ? `-${grouped}` : grouped;
}

/**
 * Format paise as Indian rupees for display (PRD 8.0, 18.1).
 * Shows WHOLE rupees only with Indian digit grouping — paise are not displayed.
 *
 *   formatINR(13316700) -> "₹1,33,167"
 *   formatINR(9416700)  -> "₹94,167"
 *   formatINR(120000)   -> "₹1,200"
 *   formatINR(0)        -> "₹0"
 */
export function formatINR(paise: Paise): string {
  const rupees = paiseToWholeRupees(paise);
  return `${RUPEE}${groupIndian(rupees)}`;
}
/**
 * Total an instalment plan adds up to: instalment x number of instalments, in integer paise.
 * Returns null when either input is missing, not positive, or the instalment count is not a whole
 * number, so callers can show nothing rather than a made-up total. No floating-point money.
 *
 *   totalPayablePaise(20000, 120) -> 2400000   (Rs 200 x 120 = Rs 24,000)
 */
export function totalPayablePaise(emiPaise: Paise, installments: number | null | undefined): Paise | null {
  if (!isValidPaise(emiPaise) || emiPaise <= 0) return null;
  if (installments == null || !Number.isInteger(installments) || installments <= 0) return null;
  const total = emiPaise * installments;
  return isValidPaise(total) ? total : null;
}

/**
 * Interest charged on a flat-rate plan: total payable (instalment x count) minus the loan amount.
 * The API has no interest field, so this is derived. Null when the plan cannot be worked out or
 * the result would be negative (never shows a made-up or negative interest).
 *
 *   interestChargedPaise(20000, 120, 2000000) -> 400000   (Rs 24,000 - Rs 20,000 = Rs 4,000)
 */
export function interestChargedPaise(
  emiPaise: Paise,
  installments: number | null | undefined,
  principalPaise: Paise | null | undefined,
): Paise | null {
  const total = totalPayablePaise(emiPaise, installments);
  if (total == null || principalPaise == null || !isValidPaise(principalPaise) || principalPaise <= 0) return null;
  const interest = total - principalPaise;
  return interest >= 0 ? interest : null;
}

/**
 * How many whole instalments an amount is made of, e.g. Rs 400 at Rs 200 each = 2. Null unless the
 * amount is an exact multiple (so a "(Rs 200 x 2)" label is never shown when it would not add up).
 */
export function wholeInstallmentsIn(amountPaise: Paise, emiPaise: Paise): number | null {
  if (!isValidPaise(amountPaise) || !isValidPaise(emiPaise) || emiPaise <= 0 || amountPaise < 0) return null;
  return amountPaise % emiPaise === 0 ? amountPaise / emiPaise : null;
}

/**
 * "Tut": the instalments that have fallen due so far minus everything paid, never below zero
 * (paid ahead shows 0). Charges (late fees etc.) are NOT part of it; they sit in the ledger and in
 * the outstanding balance. Invalid input gives 0 rather than throwing inside a screen.
 *
 *   tutPaise(40000, 20000) -> 20000   (Rs 400 due, Rs 200 paid -> Rs 200 behind)
 */
export function tutPaise(installmentsDuePaise: Paise, totalPaidPaise: Paise): Paise {
  if (!isValidPaise(installmentsDuePaise) || !isValidPaise(totalPaidPaise)) return 0;
  return Math.max(0, installmentsDuePaise - totalPaidPaise);
}

/**
 * How many instalments an amount is, rounded to a whole number (the API rounds the same way).
 * Null when the instalment amount is not positive.
 */
export function installmentsBehind(amountPaise: Paise, emiPaise: Paise): number | null {
  if (!isValidPaise(amountPaise) || !isValidPaise(emiPaise) || emiPaise <= 0 || amountPaise < 0) return null;
  return Math.round(amountPaise / emiPaise);
}