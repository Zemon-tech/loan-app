import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { SessionProvider } from '@/features/auth/session';
import { PreferencesProvider } from '@/features/settings/preferences';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SessionProvider>
      <PreferencesProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          {/* Blocking screens: no back gesture, no app navigation. */}
          <Stack.Screen name="update-required" options={{ gestureEnabled: false }} />
          <Stack.Screen name="maintenance" options={{ gestureEnabled: false }} />
          <Stack.Screen name="session-expired" options={{ gestureEnabled: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
      </PreferencesProvider>
    </SessionProvider>
  );
}
