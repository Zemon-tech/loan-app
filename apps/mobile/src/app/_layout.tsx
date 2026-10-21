import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SessionProvider } from '@/features/auth/session';
import { PreferencesProvider } from '@/features/settings/preferences';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <PreferencesProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
