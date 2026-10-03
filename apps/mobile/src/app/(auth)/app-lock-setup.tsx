/**
 * S4a: First-login App Lock setup — PRD 8.4.
 * Friendly, skippable. Uses device biometrics / passcode via expo-local-authentication.
 *
 * TODO (M-04): persist the choice in SecureStore and enforce lock on cold start / background.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import {
  BrandHeader,
  Button,
  Card,
  Icon,
  IconTile,
  Pill,
  ScreenContainer,
  type IconName,
} from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

const BENEFITS: {
  icon: IconName;
  title: string;
  body: string;
  background: AppColorRole;
  color: AppColorRole;
}[] = [
  {
    icon: 'flash-outline',
    title: 'Instant access',
    body: 'Open your loan accounts and upcoming dues with one touch.',
    background: 'primarySoft',
    color: 'primary',
  },
  {
    icon: 'eye-off-outline',
    title: 'Private & confidential',
    body: 'Keeps balances and statements hidden from anyone glancing at your screen.',
    background: 'primarySoft',
    color: 'primary',
  },
  {
    icon: 'cellular-outline',
    title: 'No OTP delay',
    body: 'Check your repayments even on a slow network.',
    background: 'successSoft',
    color: 'success',
  },
];

export default function AppLockSetupScreen() {
  const theme = useAppTheme();
  const { setAppLockEnabled } = useSession();
  const [busy, setBusy] = useState(false);

  function goHome() {
    router.replace('/loans');
  }

  async function onEnable() {
    setBusy(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
      if (!enrolled) {
        Alert.alert(
          'Set up a screen lock first',
          'Add a fingerprint, Face ID or device passcode in your phone settings, then try again.',
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable App Lock',
      });
      if (result.success) {
        setAppLockEnabled(true);
        goHome();
      }
    } catch {
      Alert.alert('App Lock unavailable', 'We could not reach your device security. You can enable it later in Settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer tone="canvas">
      <BrandHeader title="App Lock" />

      <View style={{ alignItems: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
        <Pill icon="lock-closed-outline" label="Security setup" />
        <IconTile
          name="finger-print"
          size={84}
          background="card"
          badge="happy-outline"
          badgeBackground="primary"
          badgeColor="onPrimary"
        />
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              textAlign: 'center',
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.title + 2,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            Protect your loan information
          </Text>
          <Text
            style={{
              textAlign: 'center',
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              lineHeight: 24,
            }}
          >
            Use Face ID, fingerprint or your device passcode to unlock the app quickly, without
            entering an OTP every time.
          </Text>
        </View>
      </View>

      <Card tone="card" style={{ gap: theme.spacing.lg }}>
        {BENEFITS.map((b, i) => (
          <View
            key={b.title}
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
              paddingTop: i === 0 ? 0 : theme.spacing.lg,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <IconTile name={b.icon} size={40} background={b.background} color={b.color} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.body,
                  fontWeight: theme.typography.weight.semibold,
                }}
              >
                {b.title}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
                {b.body}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm }}>
        <Icon name="shield-checkmark-outline" size={16} color="success" />
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          We never store your biometric data
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: 'flex-end', gap: theme.spacing.sm }}>
        <Button label="Enable App Lock" leftIcon="finger-print" onPress={onEnable} loading={busy} />
        <Button label="Not now" variant="ghost" onPress={goHome} disabled={busy} />
      </View>
    </ScreenContainer>
  );
}
