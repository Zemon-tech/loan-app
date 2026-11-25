import { describe, it, expect } from 'vitest';

import {
  formatINR,
  groupIndian,
  rupeesToPaise,
  paiseToWholeRupees,
  assertPaise,
  isValidPaise,
  totalPayablePaise,
  interestChargedPaise,
  wholeInstallmentsIn,
  tutPaise,
  installmentsBehind,
} from './money.js';

describe('formatINR (PRD 18.1 expected values)', () => {
  it('formats the golden sample amounts (whole rupees, Indian grouping)', () => {
    expect(formatINR(13316700)).toBe('₹1,33,167');
    expect(formatINR(9416700)).toBe('₹94,167');
  });

  it('formats small and round amounts', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(120000)).toBe('₹1,200');
    expect(formatINR(10000000)).toBe('₹1,00,000');
  });
});

describe('groupIndian', () => {
  it('groups with the Indian numbering system', () => {
    expect(groupIndian(123)).toBe('123');
    expect(groupIndian(1234)).toBe('1,234');
    expect(groupIndian(133167)).toBe('1,33,167');
    expect(groupIndian(10000000)).toBe('1,00,00,000');
  });

  it('handles negatives', () => {
    expect(groupIndian(-133167)).toBe('-1,33,167');
  });
});

describe('rupeesToPaise', () => {
  it('converts whole and decimal rupees, rounding half up', () => {
    expect(rupeesToPaise(1200)).toBe(120000);
    expect(rupeesToPaise('1200')).toBe(120000);
    expect(rupeesToPaise(1200.5)).toBe(120050);
    expect(rupeesToPaise('1,200')).toBe(120000);
    expect(rupeesToPaise(1200.005)).toBe(120001); // round half up, no FP drift
  });

  it('throws on invalid input', () => {
    expect(() => rupeesToPaise('abc')).toThrow();
  });
});

describe('paise helpers', () => {
  it('paiseToWholeRupees truncates toward zero', () => {
    expect(paiseToWholeRupees(13316700)).toBe(133167);
    expect(paiseToWholeRupees(120099)).toBe(1200);
  });

  it('isValidPaise / assertPaise guard against non-integer money', () => {
    expect(isValidPaise(100)).toBe(true);
    expect(isValidPaise(100.5)).toBe(false);
    expect(() => assertPaise(100.5)).toThrow(TypeError);
    expect(assertPaise(100)).toBe(100);
  });
});
describe('totalPayablePaise', () => {
  it('multiplies the instalment by the number of instalments in paise', () => {
    expect(totalPayablePaise(20000, 120)).toBe(2400000);
    expect(totalPayablePaise(15000, 80)).toBe(1200000);
    expect(totalPayablePaise(300000, 60)).toBe(18000000);
  });

  it.each([
    [0, 10],
    [-100, 10],
    [20000, 0],
    [20000, -5],
    [20000, 12.5],
    [20000, null],
    [20000, undefined],
    [20000.5, 10],
    [Number.MAX_SAFE_INTEGER, 2],
  ])('returns null for emi=%j installments=%j', (emi, n) => {
    expect(totalPayablePaise(emi as number, n as number | null | undefined)).toBeNull();
  });
});

describe('interestChargedPaise', () => {
  it('is total payable minus the loan amount', () => {
    expect(interestChargedPaise(20000, 120, 2000000)).toBe(400000);
    expect(interestChargedPaise(300000, 60, 15000000)).toBe(3000000);
  });
  it('is zero when there is no interest', () => {
    expect(interestChargedPaise(10000, 10, 100000)).toBe(0);
  });
  it.each([
    [20000, null, 2000000],
    [20000, 120, null],
    [20000, 120, 0],
    [0, 120, 2000000],
    [20000, 100, 2500000], // total below loan amount -> never negative
  ])('returns null for emi=%j n=%j principal=%j', (emi, n, principal) => {
    expect(interestChargedPaise(emi, n as number | null, principal as number | null)).toBeNull();
  });
});

describe('wholeInstallmentsIn', () => {
  it('counts exact multiples', () => {
    expect(wholeInstallmentsIn(40000, 20000)).toBe(2);
    expect(wholeInstallmentsIn(0, 20000)).toBe(0);
    expect(wholeInstallmentsIn(3800000, 50000)).toBe(76);
  });
  it.each([[45000, 20000], [40000, 0], [-20000, 20000], [40000.5, 20000]])(
    'returns null for amount=%j emi=%j',
    (amount, emi) => {
      expect(wholeInstallmentsIn(amount, emi)).toBeNull();
    },
  );
});

describe('tutPaise', () => {
  it('is instalments due minus total paid', () => {
    expect(tutPaise(40000, 20000)).toBe(20000);
    expect(tutPaise(570000, 300000)).toBe(270000);
  });
  it('is 0 when nothing is behind or the borrower paid ahead', () => {
    expect(tutPaise(40000, 40000)).toBe(0);
    expect(tutPaise(40000, 90000)).toBe(0);
    expect(tutPaise(0, 0)).toBe(0);
  });
  it('is 0 (not a crash) for invalid input', () => {
    expect(tutPaise(40000.5, 100)).toBe(0);
    expect(tutPaise(Number.NaN, 100)).toBe(0);
  });
});

describe('installmentsBehind', () => {
  it('rounds to whole instalments', () => {
    expect(installmentsBehind(20000, 20000)).toBe(1);
    expect(installmentsBehind(270000, 15000)).toBe(18);
    expect(installmentsBehind(0, 15000)).toBe(0);
    expect(installmentsBehind(22000, 20000)).toBe(1);
  });
  it.each([[20000, 0], [20000, -1], [-5, 100], [1.5, 100]])('returns null for amount=%j emi=%j', (a, e) => {
    expect(installmentsBehind(a, e)).toBeNull();
  });
});