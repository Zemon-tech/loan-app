/**
 * S2: Login (mobile number) — PRD 8.2.
 * One field, one button. No sign-up, no promotions, no payment.
 *
 * TODO (M-02):
 *  - POST /v1/auth/otp/request; pass otpRequestId + masked mobile to OTP screen
 *  - handle 429 ("Too many attempts. Try again in {n} minutes.")
 *  - copy must NOT reveal whether the number is registered
 *  - Privacy / Terms URLs from /config; all strings move to i18n
 */
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { BrandMark, Button, Card, Icon, Pill, ScreenContainer } from '@/components/ui';
import { Links } from '@/constants/links';
import { formatMobileInput, INDIAN_MOBILE, sanitizeMobile } from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { startLogin } = useSession();
  const [digits, setDigits] = useState('');
  const [focused, setFocused] = useState(false);

  const isValid = INDIAN_MOBILE.test(digits);
  const showError = digits.length === 10 && !isValid;

  function onContinue() {
    if (!isValid) return;
    startLogin(`+91${digits}`);
    router.push('/otp');
  }

  const caption = { color: theme.colors.textSecondary, fontSize: theme.typography.size.caption };

  return (
    <ScreenContainer tone="canvas">
      {/* Trust row */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pill dot="success" label="RBI regulated system" uppercase />
        <Pill icon="lock-closed-outline" label="256-bit Encrypted" background="canvas" />
      </View>

      <Card tone="card" style={{ padding: theme.spacing.xl, gap: theme.spacing.lg, borderRadius: theme.radius.xl }}>
        <BrandMark size={60} verified />

        <View style={{ gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            Welcome back
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 }}>
            Enter your registered mobile number to view your loan records and repayment statements.
          </Text>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.caption,
                fontWeight: theme.typography.weight.medium,
              }}
            >
              Registered Mobile Number
            </Text>
            <Text style={caption}>{digits.length}/10</Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 56,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.primarySoft,
              borderWidth: 1.5,
              borderColor: showError
                ? theme.colors.danger
                : focused
                  ? theme.colors.primary
                  : 'transparent',
            }}
          >
            <Text style={{ fontSize: theme.typography.size.subtitle }} accessibilityElementsHidden>
              {'\uD83C\uDDEE\uD83C\uDDF3'}
            </Text>
            <Text
              style={{
                marginLeft: theme.spacing.sm,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.subtitle,
                fontWeight: theme.typography.weight.medium,
              }}
            >
              +91
            </Text>
            <View
              style={{
                width: 1,
                height: 24,
                marginHorizontal: theme.spacing.md,
                backgroundColor: theme.colors.border,
              }}
            />
            <TextInput
              value={formatMobileInput(digits)}
              onChangeText={(t) => setDigits(sanitizeMobile(t))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={onContinue}
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={11}
              placeholder="98765 43210"
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="done"
              style={{
                flex: 1,
                fontSize: theme.typography.size.subtitle,
                color: theme.colors.textPrimary,
                paddingVertical: theme.spacing.md,
              }}
              accessibilityLabel="Registered mobile number, 10 digits"
            />
          </View>

          {showError ? (
            <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger, fontSize: theme.typography.size.caption }}>
              Enter a valid 10-digit mobile number.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="shield-outline" size={16} color="primary" />
              <Text style={[caption, { flexShrink: 1 }]}>
                We will send a 6-digit verification code via SMS
              </Text>
            </View>
          )}
        </View>

        <Button label="Continue" rightIcon="arrow-forward" onPress={onContinue} disabled={!isValid} />

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.canvas,
          }}
        >
          <Icon name="information-circle-outline" size={20} color="textSecondary" />
          <Text style={[caption, { flex: 1, lineHeight: 20 }]}>
            This app only shows your loan information. Your records stay private and every access is logged.
          </Text>
        </View>
      </Card>

      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: theme.spacing.lg }}>
        <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 22 }}>
          By continuing, you agree to our{' '}
          <Text
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(Links.terms)}
            style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.semibold, textDecorationLine: 'underline' }}
          >
            Terms & Conditions
          </Text>{' '}
          and{' '}
          <Text
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(Links.privacyPolicy)}
            style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.semibold, textDecorationLine: 'underline' }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </ScreenContainer>
  );
}
