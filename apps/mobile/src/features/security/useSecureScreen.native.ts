/**
 * Native (Android / iOS) implementation of `useSecureScreen`: prevents screen capture while the
 * owning screen is mounted — FLAG_SECURE on Android, the secure layer on iOS — via
 * expo-screen-capture `usePreventScreenCapture`. Metro resolves this `.native.ts` file on device
 * and the sibling `useSecureScreen.ts` (a no-op) on web, so the call site stays unconditional.
 *
 * Observable only on a development build; in Expo Go `usePreventScreenCapture` no-ops safely.
 */
import { usePreventScreenCapture } from 'expo-screen-capture';

export function useSecureScreen(): void {
  usePreventScreenCapture();
}
