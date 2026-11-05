/**
 * Prevent screen capture while a sensitive screen is mounted (FLAG_SECURE on Android, secure
 * layer on iOS). Applied to the OTP/DOB screen and every screen that renders loan details.
 *
 * NOTE: this is the source of IN-APP FLAG_SECURE. The @bam.tech plugin's
 * `preventRecentScreenshots` only covers the app-switcher snapshot, so both layers are needed.
 * Observable only on a development build (not Expo Go / web).
 *
 * The real native implementation lives in `useSecureScreen.native.ts`; this file is the WEB
 * variant and is a no-op, because `expo-screen-capture`'s `preventScreenCaptureAsync` is not
 * available on web and throws if called. Metro picks the platform file automatically, so the
 * hook is called unconditionally at the call site (no rules-of-hooks hazard).
 */
export function useSecureScreen(): void {
  // Web: screen-capture prevention is not supported by the browser / the native module. No-op.
}
