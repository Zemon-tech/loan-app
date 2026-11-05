/**
 * Feature flags derived from the API mode (FR-17, FR-0d).
 *
 * In live mode the unbacked screens (schedule, history, profile/account) and the unbacked
 * loan-detail cards are HIDDEN — the guide's wire contract has no source for them. In mock mode
 * every screen and card is shown so the prototype stays fully reviewable. The code is retained
 * in both modes; only visibility changes.
 */
import { apiMode } from './config';

/** True when the schedule / history / profile screens should be reachable (mock only). */
export function showUnbackedScreens(): boolean {
  return apiMode() === 'mock';
}

/** True when the unbacked loan-detail cards/rows should render (mock only). */
export function showUnbackedCards(): boolean {
  return apiMode() === 'mock';
}
