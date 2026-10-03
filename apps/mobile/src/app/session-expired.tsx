/**
 * Session expired — blocking screen shown when the server says the session is no longer valid.
 * Signing in again needs an OTP (an expired session cannot be resumed with biometrics).
 *
 * TODO (M-03): trigger from the API client on 401 after a failed single-flight refresh.
 */
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Icon, IconTile, Pill, ScreenContainer } from '@/components/ui';
import { maskMobileDots } from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { PLACEHOLDER_CUSTOMER } from '@/features/loans/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

export default function SessionExpiredScreen() {
  const theme = useAppTheme();
  const { mobile, logout } = useSession();

  function continueToLogin() {
    logout();
    router.replace('/login');
  }

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

          <View
            style={{
              alignSelf: 'stretch',
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              padding: theme.spacing.md,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.primarySoft,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.bold }}>
                {PLACEHOLDER_CUSTOMER.initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>Registered borrower</Text>
              <Text numberOfLines={1} style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
                {PLACEHOLDER_CUSTOMER.name}{' '}
                <Text style={{ color: theme.colors.textSecondary, fontWeight: theme.typography.weight.regular, fontSize: theme.typography.size.caption }}>
                  ({mobile ? maskMobileDots(mobile) : '+91 98\u2022\u2022\u2022\u2022\u2022002'})
                </Text>
              </Text>
            </View>
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
