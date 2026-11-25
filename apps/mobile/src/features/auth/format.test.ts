import { describe, expect, it } from 'vitest';
import {
  mobileCheckMessage,
  normalizeMobile,
  otpRequestErrorMessage,
  validateMobile,
} from './format';

describe('normalizeMobile', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['+919876543210', '9876543210'],
    ['919876543210', '9876543210'],
    ['91-98765-43210', '9876543210'],
    ['09876543210', '9876543210'],
    ['0 98765 43210', '9876543210'],
    ['98765 43210', '9876543210'],
    ['98765-43210', '9876543210'],
    ['98a76b54c3210', '9876543210'],
    ['98765432101', '9876543210'],
    ['987654321', '987654321'],
    ['9198765432', '9198765432'],
    ['+91', ''],
    ['', ''],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected);
  });
});

describe('validateMobile', () => {
  it('accepts 10 digits starting 6-9', () => {
    for (const d of ['6000000000', '7123456789', '8123456789', '9876543210']) {
      expect(validateMobile(d)).toBe('OK');
    }
  });
  it('flags a wrong first digit immediately', () => {
    for (const d of ['0', '1', '5', '5123456789', '0123456789']) {
      expect(validateMobile(d)).toBe('BAD_START');
    }
  });
  it('flags short numbers', () => {
    expect(validateMobile('9')).toBe('TOO_SHORT');
    expect(validateMobile('987654321')).toBe('TOO_SHORT');
  });
  it('flags empty', () => {
    expect(validateMobile('')).toBe('EMPTY');
  });
});

describe('messages', () => {
  it('has plain messages for each failed check', () => {
    expect(mobileCheckMessage('OK')).toBeNull();
    expect(mobileCheckMessage('EMPTY')).toBe('Please enter your 10-digit mobile number.');
    expect(mobileCheckMessage('TOO_SHORT')).toBe('Please enter your 10-digit mobile number.');
    expect(mobileCheckMessage('BAD_START')).toBe('Mobile numbers start with 6, 7, 8 or 9.');
  });
  it('maps request errors without technical text', () => {
    expect(otpRequestErrorMessage('NETWORK')).toMatch(/No internet/);
    expect(otpRequestErrorMessage('RATE_LIMITED')).toMatch(/Too many attempts/);
    expect(otpRequestErrorMessage('SERVER')).toBe('Something went wrong. Please try again.');
    expect(otpRequestErrorMessage('ADAPTER')).toBe('Something went wrong. Please try again.');
  });
});