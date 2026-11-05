/**
 * Per-install random deviceId (8-100 chars, never a hardware identifier).
 *
 * Generated once with expo-crypto on first launch, persisted in SecureStore with
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY, reused for every verify + refresh. NOT cleared on logout
 * (it identifies the install, not the session). SecureStore failures fall back to a fresh
 * in-session id so auth can still proceed; the value is never logged.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'device_id';

const STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function newDeviceId(): string {
  // randomUUID() -> 36 chars; strip dashes -> 32 chars (within the guide's 8-100).
  return Crypto.randomUUID().replace(/-/g, '');
}

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY, STORE_OPTS);
    if (existing && existing.length >= 8) {
      cached = existing;
      return existing;
    }
  } catch {
    // SecureStore read failure: fall through to generate a fresh id.
  }

  const generated = newDeviceId();
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generated, STORE_OPTS);
  } catch {
    // Persist failure: use the in-memory id for this session; never surface the value.
  }
  cached = generated;
  return generated;
}
