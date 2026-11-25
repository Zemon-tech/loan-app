import { describe, expect, it } from 'vitest';
import { redactContext } from './logger';

describe('redactContext', () => {
  it('drops sensitive keys and scrubs digit runs', () => {
    const out = redactContext({
      kind: 'NETWORK',
      mobileNumber: '9876543210',
      otp: '123456',
      accessToken: 'abc',
      note: 'call 9876543210 now',
      count: 2,
    });
    expect(out).toEqual({ kind: 'NETWORK', note: 'call [redacted] now', count: 2 });
  });
});