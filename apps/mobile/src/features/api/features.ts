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
/**
 * True when the loan overview shows a "Pay now" button in the Next collection card. The button has
 * NO action yet (no link, no gateway): it only tells the user online payment is not available.
 * Payments are now in scope (AGENTS.md, owner decision 2026-11-25); replace the no-op with the real
 * flow when it is built. Flip to false to hide the button everywhere.
 */
export function showPayNow(): boolean {
  return true;
}