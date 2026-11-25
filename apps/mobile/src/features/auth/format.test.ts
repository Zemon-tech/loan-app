import { describe, expect, it } from 'vitest';
import {
  mobileCheckKey,
  extractOtp,
  normalizeMobile,
  otpRequestErrorKey,
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
    expect(mobileCheckKey('OK')).toBeNull();
    expect(mobileCheckKey('EMPTY')).toBe('login.err.enter10');
    expect(mobileCheckKey('TOO_SHORT')).toBe('login.err.enter10');
    expect(mobileCheckKey('BAD_START')).toBe('login.err.startDigit');
  });

  it('maps request failures to non-revealing keys', () => {
    expect(otpRequestErrorKey('NETWORK')).toBe('login.err.network');
    expect(otpRequestErrorKey('RATE_LIMITED')).toBe('login.err.rateLimited');
    expect(otpRequestErrorKey('SERVER')).toBe('login.err.generic');
    expect(otpRequestErrorKey('ADAPTER')).toBe('login.err.generic');
  });
});

describe('extractOtp', () => {
  it.each([
    ['123456', '123456'],
    [' 123456 ', '123456'],
    ['123 456', '123456'],
    ['123-456', '123456'],
    ['123456 is your verification code', '123456'],
    ['Your code 123456. Do not share. 123456', '123456'],
  ])('accepts %j', (input, expected) => {
    expect(extractOtp(input)).toBe(expected);
  });

  it.each([
    [''],
    [null],
    [undefined],
    ['12345'],
    ['1234567'],
    ['abc123'],
    ['code 123456 or 654321'],
    ['call 9876543210'],
  ])('rejects %j', (input) => {
    expect(extractOtp(input as string | null | undefined)).toBeNull();
  });
});