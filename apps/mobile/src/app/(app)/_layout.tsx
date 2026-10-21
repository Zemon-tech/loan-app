import { Redirect, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/features/auth/session';
import { usePreferences } from '@/features/settings/preferences';

/**
 * Authenticated area Stack navigator.
 * Hosts the primary tab bar in `(tabs)` and pushes detail screens (`loan/[loanId]`, `account/*`)
 * with native slide-from-right transitions and swipe-to-dismiss gesture (sliding page right).
 */
export default function AppLayout() {
  const { isLoggedIn, isAppLockEnabled, isLocked, lock } = useSession();
  const { autoLockSeconds } = usePreferences();
  const backgroundedAt = useRef<number | null>(null);

  // App Lock: when the app returns from the background after the chosen interval, lock it again.
  useEffect(() => {
    if (!isLoggedIn || !isAppLockEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        const awaySeconds = (Date.now() - backgroundedAt.current) / 1000;
        backgroundedAt.current = null;
        if (awaySeconds >= autoLockSeconds) lock();
      }
    });
    return () => sub.remove();
  }, [isLoggedIn, isAppLockEnabled, autoLockSeconds, lock]);

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }
  if (isAppLockEnabled && isLocked) {
    return <Redirect href="/unlock" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="loan/[loanId]" options={{ headerShown: false }} />
      <Stack.Screen name="account/settings" options={{ headerShown: false }} />
      <Stack.Screen name="account/help" options={{ headerShown: false }} />
      <Stack.Screen name="account/legal" options={{ headerShown: false }} />
      <Stack.Screen name="account/delete" options={{ headerShown: false }} />
    </Stack>
  );
}
