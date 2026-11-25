import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { en } from './en';
import { hi } from './hi';

type Tree = { [key: string]: string | Tree };

/** "a.b.c" -> value for every leaf of a catalog. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const EN = flatten(en as unknown as Tree);
const HI = flatten(hi as unknown as Tree);
const placeholders = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort();

describe('catalogs', () => {
  it('Hindi has exactly the same keys as English', () => {
    expect(Object.keys(HI).sort()).toEqual(Object.keys(EN).sort());
  });

  it('no string is empty (end punctuation keys excepted)', () => {
    for (const [k, v] of Object.entries(EN)) expect(v.length, `en ${k}`).toBeGreaterThan(0);
    for (const [k, v] of Object.entries(HI)) expect(v.length, `hi ${k}`).toBeGreaterThan(0);
  });

  it('{{placeholders}} match between English and Hindi for every key', () => {
    for (const k of Object.keys(EN)) expect(placeholders(HI[k]!), `placeholders of ${k}`).toEqual(placeholders(EN[k]!));
  });

  it('digits stay 0-9 (no Devanagari digits)', () => {
    for (const [k, v] of Object.entries(HI)) expect(/[\u0966-\u096F]/.test(v), `hi ${k}`).toBe(false);
  });

  it('keeps the English terms EMI, OTP, UPI and Tut', () => {
    expect(HI['summary.tut']).toBe('Tut');
    expect(HI['table.emiTenure']).toContain('EMI');
    expect(HI['logout.message']).toContain('OTP');
    expect(HI['mode.UPI']).toBe('UPI');
    expect(HI['account.logout']).toContain('ALANG CREDITS');
  });

  it('covers every dynamic key family (API values)', () => {
    const families: Record<string, string[]> = {
      mode: ['Cash', 'Bank', 'Wallet', 'UPI', 'Other'],
      channel: ['Agent', 'Office', 'Online'],
      txnType: [
        'installment_payment', 'advance_installment', 'adjustment_received', 'discount', 'principal_repayment',
        'late_fee', 'overdue_interest', 'recovery_visit_charge', 'loan_disbursed', 'additional_loan',
        'previous_loan_adjustment',
      ],
      weekday: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      frequency: ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'],
    };
    for (const [family, values] of Object.entries(families)) {
      for (const v of values) {
        expect(EN[`${family}.${v}`], `en ${family}.${v}`).toBeTruthy();
        expect(HI[`${family}.${v}`], `hi ${family}.${v}`).toBeTruthy();
      }
    }
  });
});

describe('key usage in source', () => {
  const ROOTS = [...new Set(Object.keys(EN).map((k) => k.split('.')[0]))].join('|');
  const KEY = new RegExp(`['"\`]((?:${ROOTS})\\.[A-Za-z0-9_.]+)['"\`]`, 'g');

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
    }
    return out;
  }

  it('every translation key referenced in code exists in the catalog', () => {
    const missing: string[] = [];
    let found = 0;
    for (const file of walk(join(__dirname, '..'))) {
      if (file.includes(`${join('src', 'i18n')}`)) continue; // the catalogs themselves
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(KEY)) {
        found += 1;
        if (!(m[1]! in EN)) missing.push(`${file.split('src')[1]}: ${m[1]}`);
      }
    }
    expect(found, 'the scan should find the keys used in the app').toBeGreaterThan(40);
    expect(missing).toEqual([]);
  });
});