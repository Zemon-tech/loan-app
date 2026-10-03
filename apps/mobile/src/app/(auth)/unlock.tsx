/**
 * S4b: App Unlock — PRD 8.4.
 * Shown on cold start / return from background when App Lock is enabled.
 * Prompts device authentication automatically; "Use OTP instead" falls back to login.
 *
 * TODO (M-04): read lock state from SecureStore; after N failed attempts force OTP login.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { BrandMark, Button, Icon, Pill, ScreenContainer } from '@/components/ui';
import { maskMobileDots } from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { PLACEHOLDER_CUSTOMER } from '@/features/loans/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

// Prototype display name; real name comes from GET /v1/me.
const DEMO_NAME = PLACEHOLDER_CUSTOMER.name;

export default function UnlockScreen() {
  const theme = useAppTheme();
  const { mobile, unlock, logout } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const authenticate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Loan Tracker',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        unlock();
        router.replace('/loans');
      } else {
        setError('Could not verify it\u2019s you. Try again or use OTP instead.');
      }
    } catch {
      setError('Device authentication is unavailable. Use OTP instead.');
    } finally {
      setBusy(false);
    }
  }, [unlock]);

  // Auto-prompt once the screen has settled.
  useEffect(() => {
    const id = setTimeout(authenticate, 300);
    return () => clearTimeout(id);
  }, [authenticate]);

  function onUseOtp() {
    logout();
    router.replace('/login');
  }

  const initials = DEMO_NAME.split(' ').map((p) => p[0]).join('');

  return (
    <ScreenContainer tone="canvas">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <BrandMark size={40} />
          <View>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
              Loan Tracker
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              Verified secure client
            </Text>
          </View>
        </View>
        <Pill icon="lock-closed-outline" label="Secure" color="success" uppercase />
      </View>

      <View style={{ alignItems: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.xxl }}>
        <View
          style={{
            width: 128,
            height: 128,
            borderRadius: 64,
            backgroundColor: theme.colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: theme.colors.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="finger-print" size={48} color="primary" />
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title + 2, fontWeight: theme.typography.weight.bold }}
          >
            Unlock Loan Tracker
          </Text>
          <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 }}>
            Use your fingerprint, face or device passcode to continue.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.card,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontSize: 11, fontWeight: theme.typography.weight.bold }}>
              {initials}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            Logged in as{' '}
            <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.semibold }}>{DEMO_NAME}</Text>{' '}
            ({maskMobileDots(mobile)})
          </Text>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ textAlign: 'center', color: theme.colors.danger, fontSize: theme.typography.size.caption }}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, justifyContent: 'flex-end', gap: theme.spacing.md }}>
        <Button label="Use biometrics" leftIcon="finger-print" onPress={authenticate} loading={busy} />
        <Button label="Use OTP instead" variant="secondary" leftIcon="chatbubble-ellipses-outline" onPress={onUseOtp} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="shield-outline" size={14} color="textSecondary" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            Read-only, encrypted session
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
