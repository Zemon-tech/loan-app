import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth/session';
import { usePreferences } from '@/features/settings/preferences';
import { useAppTheme } from '@/hooks/use-theme';

/**
 * Authenticated area. Bottom tabs: Home, Profile (PRD screen map).
 * Non-tab routes (loan detail, account sub-screens) live in this group but are
 * hidden from the tab bar via `href: null` and pushed as stack-like screens.
 *
 * TODO (M-03): the gate below uses the throwaway session flag; replace with real auth.
 */
export default function AppLayout() {
  const { isLoggedIn, isAppLockEnabled, isLocked, lock } = useSession();
  const { autoLockSeconds } = usePreferences();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const backgroundedAt = useRef<number | null>(null);

  // App Lock: when the app returns from the background after the chosen interval, lock it again.
  // Only 'background' counts ('inactive' also fires for the Face ID sheet itself).
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
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: { fontSize: theme.typography.size.caption, fontWeight: '600', marginTop: 2 },
        // Room above the icons, and the home-indicator / gesture-bar inset below the labels.
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 60 + insets.bottom,
          paddingTop: theme.spacing.sm,
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
        },
      }}
    >
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Home',
          headerShown: false, // Home renders its own app bar
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          headerShown: false, // Profile renders its own header
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* Hidden from the tab bar — reached by navigation. */}
      {/* Loan workspace (Overview | Schedule | History): one nested layout, no tab bar. */}
      <Tabs.Screen
        name="loan/[loanId]"
        options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen name="account/settings" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="account/help" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="account/legal" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="account/delete" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
