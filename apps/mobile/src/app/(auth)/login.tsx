/**
 * S2: Login (mobile number) — structured skeleton (PRD 8.2).
 *
 * TODO (M-02):
 *  - validate Indian mobile ^[6-9]\d{9}$, inline error
 *  - POST /v1/auth/otp/request; pass otpRequestId + masked mobile to OTP screen
 *  - handle 429 ("Too many attempts. Try again in {n} minutes.")
 *  - copy must NOT reveal whether the number is registered
 *  - all strings move to i18n
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, ScreenContainer } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { startLogin } = useSession();
  const [mobile, setMobile] = useState('');

  // Prototype: accept any 10 digits; real validation is a TODO above.
  const canContinue = mobile.length === 10;

  function onSendOtp() {
    startLogin(`+91${mobile}`);
    router.push('/otp');
  }

  return (
    <ScreenContainer>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xxl }}>
        {/* TODO: app logo + lender name */}
        <Text
          style={{
            fontSize: theme.typography.size.heading,
            fontWeight: theme.typography.weight.bold as '700',
            color: theme.colors.textPrimary,
          }}
        >
          Log in
        </Text>
        <Text style={{ fontSize: theme.typography.size.body, color: theme.colors.textSecondary }}>
          Enter the mobile number registered with your lender.
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.md,
          minHeight: theme.touchTarget.min,
        }}
      >
        <Text style={{ fontSize: theme.typography.size.body, color: theme.colors.textPrimary }}>
          +91{'  '}
        </Text>
        <TextInput
          value={mobile}
          onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="10-digit mobile number"
          placeholderTextColor={theme.colors.textSecondary}
          style={{
            flex: 1,
            fontSize: theme.typography.size.body,
            color: theme.colors.textPrimary,
            paddingVertical: theme.spacing.md,
          }}
          accessibilityLabel="Mobile number"
        />
      </View>

      <Button label="Send OTP" onPress={onSendOtp} disabled={!canContinue} />

      {/* TODO: Privacy Policy and Terms links (open in-app browser) */}
      <Text style={{ fontSize: theme.typography.size.caption, color: theme.colors.textSecondary }}>
        By continuing you agree to the Privacy Policy and Terms.
      </Text>
    </ScreenContainer>
  );
}
