import { describe, it, expect } from 'vitest';

import {
  formatINR,
  groupIndian,
  rupeesToPaise,
  paiseToWholeRupees,
  assertPaise,
  isValidPaise,
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
