/**
 * S3: OTP verification — structured skeleton (PRD 8.3).
 *
 * TODO (M-02):
 *  - 6-box OTP input with textContentType="oneTimeCode" + autoComplete="sms-otp"
 *    (do NOT request READ_SMS / RECEIVE_SMS permissions)
 *  - POST /v1/auth/otp/verify; store refresh token in SecureStore, access token in memory
 *  - resend countdown (resendAfterSec), "change number" link
 *  - error codes: AUTH_INVALID_OTP (attemptsLeft), AUTH_OTP_EXPIRED, AUTH_OTP_ATTEMPTS_EXCEEDED
 *  - on first login, prompt App Lock setup (S4a) before Home
 *  - all strings move to i18n
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, ScreenContainer } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

export default function OtpScreen() {
  const theme = useAppTheme();
  const { mobile, completeLogin } = useSession();
  const [otp, setOtp] = useState('');

  const canVerify = otp.length === 6;

  function onVerify() {
    // Prototype: any 6 digits logs in. Real verify is a TODO above.
    completeLogin();
    router.replace('/loans');
  }

  return (
    <ScreenContainer>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xxl }}>
        <Text
          style={{
            fontSize: theme.typography.size.heading,
            fontWeight: theme.typography.weight.bold as '700',
            color: theme.colors.textPrimary,
          }}
        >
          Enter OTP
        </Text>
        <Text style={{ fontSize: theme.typography.size.body, color: theme.colors.textSecondary }}>
          We sent a code to {mobile ?? 'your mobile number'}.
        </Text>
      </View>

      {/* TODO: replace single input with a 6-box OtpInput primitive (F-07) */}
      <TextInput
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        placeholder="6-digit code"
        placeholderTextColor={theme.colors.textSecondary}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          minHeight: theme.touchTarget.min,
          fontSize: theme.typography.size.subtitle,
          letterSpacing: 6,
          color: theme.colors.textPrimary,
        }}
        accessibilityLabel="One-time code"
      />

      <Button label="Verify" onPress={onVerify} disabled={!canVerify} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {/* TODO: resend countdown + change-number flow */}
        <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.body }}>
          Resend OTP
        </Text>
        <Text
          style={{ color: theme.colors.primary, fontSize: theme.typography.size.body }}
          onPress={() => router.back()}
        >
          Change number
        </Text>
      </View>
    </ScreenContainer>
  );
}
