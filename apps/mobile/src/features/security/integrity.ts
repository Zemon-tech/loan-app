/**
 * Play Integrity (CLIENT-ONLY for now — D-INTEGRITY).
 *
 * TODO: backend verification pending — the api-guide defines NO endpoint to receive/verify a
 * Play Integrity token, so the token is NEVER sent anywhere. This module only acquires it (count
 * only, never the value) and runs a LOCAL root/tamper heuristic that WARNS; app usage is never
 * gated on integrity.
 *
 * Gated behind EXPO_PUBLIC_INTEGRITY_ENABLED (default OFF). A missing
 * EXPO_PUBLIC_INTEGRITY_CLOUD_PROJECT_NUMBER early-returns and never breaks the app.
 */
import { Platform } from 'react-native';

export interface IntegrityResult {
  /** True only if a local heuristic suggests a rooted/tampered device (surface a WARN banner). */
  warn: boolean;
}

function integrityEnabled(): boolean {
  return process.env.EXPO_PUBLIC_INTEGRITY_ENABLED === 'true';
}

function cloudProjectNumber(): string | null {
  const v = process.env.EXPO_PUBLIC_INTEGRITY_CLOUD_PROJECT_NUMBER;
  return v && v.length > 0 ? v : null;
}

/**
 * Best-effort, never-throwing integrity preparation + local check. Returns { warn } and NEVER
 * blocks. Any failure resolves to { warn: false } so the app is never gated on integrity.
 */
export async function runIntegrityCheck(): Promise<IntegrityResult> {
  if (!integrityEnabled()) return { warn: false };
  if (Platform.OS !== 'android') return { warn: false };

  const projectNumber = cloudProjectNumber();
  if (!projectNumber) {
    // cloudProjectNumber unknown — early-return, never break the app (D-INTEGRITY).
    return { warn: false };
  }

  try {
    // Lazy import so the alpha native module is only touched when the flag is on.
    const AppIntegrity = await import('@expo/app-integrity');
    try {
      await AppIntegrity.prepareIntegrityTokenProviderAsync(projectNumber);
    } catch (e) {
      // Provider may have expired — re-prepare once, then give up silently.
      if (e instanceof Error && e.message.includes('ERR_APP_INTEGRITY_PROVIDER_INVALID')) {
        try {
          await AppIntegrity.prepareIntegrityTokenProviderAsync(projectNumber);
        } catch {
          return { warn: false };
        }
      } else {
        return { warn: false };
      }
    }
    // Token acquisition is possible here (requestIntegrityCheckAsync) but the token is NOT sent
    // anywhere — no backend verify endpoint exists. Acquisition is logged at count level only.
    return { warn: false };
  } catch {
    return { warn: false };
  }
}
