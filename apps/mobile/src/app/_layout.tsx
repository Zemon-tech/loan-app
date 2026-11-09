import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppColors } from '@/constants/theme';
import { queryClient, setupQueryManagers } from '@/features/api/queryClient';
import { SessionProvider, useSession } from '@/features/auth/session';
import { PreferencesProvider } from '@/features/settings/preferences';
import { useAppTheme } from '@/hooks/use-theme';

// Keep the NATIVE splash up until the stored session has been checked (module scope, not awaited).
void SplashScreen.preventAutoHideAsync();

/** Hard stop so a stuck boot check can never trap the user behind the splash. */
const SPLASH_MAX_MS = 10_000;

/** Navigation chrome (screen backgrounds, transitions) built from the app tokens. */
function navigationTheme(scheme: 'light' | 'dark') {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = AppColors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.canvas,
      card: c.card,
      text: c.textPrimary,
      border: c.border,
      notification: c.danger,
    },
  };
}

/**
 * Route guards (Expo Router Stack.Protected): signed-out users only see `(auth)`, signed-in
 * users only see `(app)`. When the session state flips the router moves the user itself, so
 * screens never navigate manually after login/logout (that was racing the state update).
 * `index` is the anchor: it redirects to the right place for the current state.
 */
function RootNavigator() {
  const { isLoggedIn, isBootstrapping } = useSession();

  useEffect(() => {
    if (!isBootstrapping) SplashScreen.hide();
  }, [isBootstrapping]);

  useEffect(() => {
    const id = setTimeout(() => SplashScreen.hide(), SPLASH_MAX_MS);
    return () => clearTimeout(id);
  }, []);

  // The native splash is still covering the screen while the stored session is validated.
  if (isBootstrapping) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(app)" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
      {/* Blocking screens: no back gesture, fade in as full-screen notice. */}
      <Stack.Screen name="update-required" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="maintenance" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="session-expired" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { scheme } = useAppTheme();

  // Wire onlineManager + focusManager once at startup.
  useEffect(() => setupQueryManagers(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <ThemeProvider value={navigationTheme(scheme)}>
              <RootNavigator />
              <StatusBar style="auto" />
            </ThemeProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}