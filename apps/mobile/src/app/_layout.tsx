import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppColors } from '@/constants/theme';
import { queryClient, setupQueryManagers } from '@/features/api/queryClient';
import { SessionProvider } from '@/features/auth/session';
import { PreferencesProvider } from '@/features/settings/preferences';
import { useAppTheme } from '@/hooks/use-theme';

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
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  animationDuration: 250,
                }}
              >
                <Stack.Screen name="index" options={{ animation: 'fade' }} />
                <Stack.Screen name="(auth)" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="(app)" options={{ animation: 'slide_from_right' }} />
                {/* Blocking screens: no back gesture, fade in as full-screen notice. */}
                <Stack.Screen name="update-required" options={{ gestureEnabled: false, animation: 'fade' }} />
                <Stack.Screen name="maintenance" options={{ gestureEnabled: false, animation: 'fade' }} />
                <Stack.Screen name="session-expired" options={{ gestureEnabled: false, animation: 'fade' }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
