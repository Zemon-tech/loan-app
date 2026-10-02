import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

/**
 * Authenticated area. Bottom tabs: My Loans, My Account (PRD screen map).
 * Non-tab routes (loan detail, account sub-screens) live in this group but are
 * hidden from the tab bar via `href: null` and pushed as stack-like screens.
 *
 * TODO (M-03): the gate below uses the throwaway session flag; replace with real auth.
 */
export default function AppLayout() {
  const { isLoggedIn } = useSession();
  const theme = useAppTheme();

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  // Text-glyph tab icons for the prototype (TODO: replace with real icons).
  const icon = (glyph: string) => ({ color }: { color: ColorValue }) => (
    <Text style={{ color, fontSize: 18 }}>{glyph}</Text>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="loans"
        options={{ title: 'My Loans', tabBarIcon: icon('\u25A4') }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'My Account', tabBarIcon: icon('\u25CB') }}
      />

      {/* Hidden from the tab bar — reached by navigation. */}
      <Tabs.Screen name="loan/[loanId]/index" options={{ href: null, title: 'Loan' }} />
      <Tabs.Screen name="loan/[loanId]/schedule" options={{ href: null, title: 'EMI schedule' }} />
      <Tabs.Screen name="loan/[loanId]/history" options={{ href: null, title: 'Payment history' }} />
      <Tabs.Screen name="account/settings" options={{ href: null, title: 'Settings' }} />
      <Tabs.Screen name="account/help" options={{ href: null, title: 'Help & Support' }} />
      <Tabs.Screen name="account/legal" options={{ href: null, title: 'Legal' }} />
      <Tabs.Screen name="account/delete" options={{ href: null, title: 'Delete account' }} />
    </Tabs>
  );
}
