/**
 * Feature flags for the app screens and cards.
 *
 * All screens (Home, Profile, Loan Overview, Transactions History) and enriched loan-detail
 * cards (Disbursal, Dues, Settlement, Last Payment) are now backed by the live partner API
 * (as of the 2026-11-18 contract update).
 */

/** True when the history / profile screens should be reachable. */
export function showUnbackedScreens(): boolean {
  return true;
}

/** True when the enriched loan-detail cards/rows should render. */
export function showUnbackedCards(): boolean {
  return false;
}

/** True when the Profile tab should render. */
export function showProfileTab(): boolean {
  return true;
}

/** True when the Transactions history segment should render. */
export function showTransactions(): boolean {
  return true;
}
