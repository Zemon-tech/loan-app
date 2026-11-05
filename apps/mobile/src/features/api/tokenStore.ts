/**
 * Token store — Option A (FR-13, NFR-1).
 *
 *   - Refresh token: expo-secure-store (Android Keystore / iOS Keychain), key `refresh_token`,
 *     keychainAccessible WHEN_UNLOCKED_THIS_DEVICE_ONLY, NO requireAuthentication (not
 *     biometric-gated). THIS_DEVICE_ONLY keeps it off device backups/transfers.
 *   - Access token: in-memory module variable ONLY; never written to disk.
 *
 * `expiresInSeconds` is intentionally DROPPED — not stored, not used. The one and only refresh
 * trigger is a 401 carrying `Token-Expired: true` (FR-0h). Every SecureStore call is wrapped so
 * a native read/write failure is treated as "no token" (recoverable) and is NEVER logged with a
 * value.
 */
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'refresh_token';

const STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let accessToken: string | null = null;

/** Load the persisted refresh token, or null if absent / unreadable. */
export async function loadRefreshToken(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, STORE_OPTS);
    return value && value.length > 0 ? value : null;
  } catch {
    return null; // treat a native failure as "no token"
  }
}

/**
 * Persist a new token pair. The refresh token is written FIRST (single-use tokens: save the
 * new one before using the new access token), then the access token is set in memory.
 */
export async function saveTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken, STORE_OPTS);
  } catch {
    // Persisting failed; keep the in-memory access token so the current session still works.
  }
  accessToken = tokens.accessToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(value: string | null): void {
  accessToken = value;
}

/** Delete the refresh token and clear the in-memory access token. */
export async function clearTokens(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, STORE_OPTS);
  } catch {
    // Nothing to surface; the in-memory token is already cleared.
  }
}
