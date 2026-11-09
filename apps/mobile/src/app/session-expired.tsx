/**
 * Session expired — blocking screen shown when the server says the session is no longer valid.
 * Signing in again needs an OTP.
 * Shown after the API client's single-flight refresh is rejected by the server.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Icon, IconTile, Pill, ScreenContainer } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

export default function SessionExpiredScreen() {
  const theme = useAppTheme();
  const { isLoggedIn, logout } = useSession();
  const [leaving, setLeaving] = useState(false);

  function continueToLogin() {
    logout();
    setLeaving(true);
  }

  // Navigate only once the signed-out state is in place, so the (auth) route guard allows it.
  useEffect(() => {
    if (leaving && !isLoggedIn) router.replace('/login');
  }, [leaving, isLoggedIn]);

  return (
    <ScreenContainer tone="canvas" scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
        <Pill icon="shield-outline" label="Security timeout" color="primary" />

        <Card tone="card" style={{ alignSelf: 'stretch', alignItems: 'center', borderRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.lg }}>
          <IconTile name="lock-closed" size={72} background="primarySoft" badge="time-outline" badgeColor="textSecondary" />

          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="header"
              style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold, textAlign: 'center' }}
            >
              Your session has expired
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24, textAlign: 'center' }}>
              For your privacy and security, you were signed out. Please log in again.
            </Text>
          </View>

          <Button label="Continue to login" rightIcon="arrow-forward" onPress={continueToLogin} style={{ alignSelf: 'stretch' }} />
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="lock-closed-outline" size={14} color="textSecondary" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
            Your loan information was not changed
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
