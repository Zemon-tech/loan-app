/**
 * S10: Settings — structured skeleton (PRD 8.10).
 *
 * TODO (M-04/M-09):
 *  - App lock toggle (enable/disable requires biometric check, expo-local-authentication)
 *  - Notifications toggle (Phase 2), Language selector (Phase 2)
 *  - strings to i18n
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Button, Card, ScreenContainer } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { logout } = useSession();
  const [appLock, setAppLock] = useState(false);

  function onLogout() {
    // TODO (M-03): clear SecureStore, in-memory state, and TanStack Query cache.
    logout();
    router.replace('/login');
  }

  return (
    <ScreenContainer>
      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: theme.touchTarget.min,
          }}
        >
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body }}>
            App lock
          </Text>
          {/* TODO (M-04): require a biometric check before enabling/disabling */}
          <Switch value={appLock} onValueChange={setAppLock} />
        </View>
      </Card>

      <Button label="Log out" variant="secondary" onPress={onLogout} />
    </ScreenContainer>
  );
}
