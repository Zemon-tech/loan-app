/**
 * Field blacklist (PRD Appendix B, 10.5). These keys (or near-matches) MUST NEVER appear in any
 * API response. A contract test scans response objects recursively, case-insensitively, and
 * fails on any match. Enforced in addition to the whitelist mappers — defence in depth.
 */

/** Substrings matched case-insensitively against every response key. */
export const BLACKLIST_KEY_SUBSTRINGS: string[] = [
  // staff / internal people
  'agent', 'verifiedby', 'verified_by', 'staff', 'username', 'useremail', 'route',
  // internal notes / flags
  'remark', 'note', 'warning', 'startating', 'starrating', 'rating', 'flag', 'tag', 'messagecount',
  // guarantor
  'guarantor', 'guarantee',
  // KYC / location
  'kyc', 'aadhaar', 'aadhar', 'pan', 'homelocation', 'home_location', 'geolocation', 'latitude', 'longitude',
  // internal status / risk
  'npa', 'legal', 'recoverystage', 'recovery_stage', 'collectionbucket', 'collection_bucket', 'riskscore', 'risk_score', 'bucket',
  // internal plumbing
  'sqlerror', 'stacktrace', 'stack_trace', 'tablename', 'table_name', 'columnname', 'column_name',
  // staff-only financials
  'commission', 'collectionsplit', 'collection_split', 'costoffunds', 'cost_of_funds',
  // payment instruments (tracker-only; PRD rule 11)
  'upi', 'qrcode', 'qr_code', 'bankaccount', 'bank_account', 'ifsc', 'paymentlink', 'payment_link', 'vpa',
];

/** Keys that are explicitly ALLOWED even if they contain a blacklisted substring. */
const ALLOWLIST_EXACT = new Set<string>([
  // none yet; add here with a justification comment if a false positive appears
]);

export interface BlacklistHit {
  key: string;
  path: string;
}

/** Recursively collect any object keys that match a blacklisted substring. */
export function findBlacklistedKeys(value: unknown, path = '$'): BlacklistHit[] {
  const hits: BlacklistHit[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findBlacklistedKeys(v, `${path}[${i}]`)));
  } else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!ALLOWLIST_EXACT.has(key) && BLACKLIST_KEY_SUBSTRINGS.some((b) => norm.includes(b))) {
        hits.push({ key, path: `${path}.${key}` });
      }
      hits.push(...findBlacklistedKeys(v, `${path}.${key}`));
    }
  }
  return hits;
}
