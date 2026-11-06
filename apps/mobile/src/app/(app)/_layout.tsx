import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/features/auth/session';

/**
 * Authenticated area Stack navigator.
 * Hosts the primary tab bar in `(tabs)` and pushes detail screens (`loan/[loanId]`, `account/*`)
 * with native slide-from-right transitions and swipe-to-dismiss gesture (sliding page right).
 */
export default function AppLayout() {
  const { isLoggedIn } = useSession();

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
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
