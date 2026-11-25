/**
 * S2: Login (mobile number) — PRD 8.2.
 * One field, one button. No sign-up, no promotions, no payment.
 *
 * Layout follows the golden ratio (AppGolden): brand zone 38.2% / form zone 61.8% of the
 * usable screen height. Copy must NOT reveal whether the number is registered.
 */
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark, Button, Icon, ScreenContainer } from '@/components/ui';
import { COMPANY_NAME, COMPANY_PARENT_TAG } from '@/constants/brand';
import { apiMode } from '@/features/api/config';
import * as endpoints from '@/features/api/endpoints';
import {
  formatMobileInput,
  mobileCheckMessage,
  normalizeMobile,
  otpRequestErrorMessage,
  validateMobile,
} from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';
import { logger } from '@/lib/logger';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { golden } = theme;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { startLogin } = useSession();
  const [digits, setDigits] = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false); // blurred once, or Continue tapped
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const inFlight = useRef(false); // double-tap guard (state updates are async)

  const check = validateMobile(digits);
  // Wrong first digit shows at once; "too short" / "empty" wait for blur or Continue.
  const checkText = check === 'BAD_START' || touched ? mobileCheckMessage(check) : null;
  const errorText = serverError ?? checkText;

  // Usable height split by the golden ratio (zones grow, never clip, at large font sizes).
  const usable = Math.max(
    height - insets.top - insets.bottom - theme.spacing.sm - theme.spacing.xl,
    0,
  );
  const brandMinHeight = Math.round(usable * golden.split.brand);
  const formMinHeight = Math.round(usable * golden.split.form);

  async function onContinue() {
    if (inFlight.current) return;
    setTouched(true);
    if (check !== 'OK') return;
    inFlight.current = true;
    setServerError(null);
    try {
      // Mock mode (dev only) keeps the instant, backend-free flow.
      if (apiMode() === 'mock') {
        startLogin(`+91${digits}`);
        router.push('/otp');
        return;
      }
      setSubmitting(true);
      logger.info('login', 'otp_request_started');
      const res = await endpoints.otpRequest(digits);
      if (res.ok) {
        logger.info('login', 'otp_request_succeeded');
        // 202: session state is set only after success; neutral copy on the OTP screen.
        startLogin(`+91${digits}`);
        router.push('/otp');
        return;
      }
      setServerError(otpRequestErrorMessage(res.error.kind));
    } catch {
      logger.error('login', 'otp_request_unexpected_error');
      setServerError(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const bodyText = { color: theme.colors.textSecondary, fontSize: golden.type.body };

  return (
    <ScreenContainer tone="canvas" scrollToEndOnKeyboard contentStyle={{ gap: 0 }}>
      <View
        style={{
          minHeight: brandMinHeight,
          alignItems: 'center',
          justifyContent: 'center',
          gap: golden.spacing.f1,
        }}
      >
        <BrandMark size={golden.spacing.f5 + golden.spacing.f4 + golden.spacing.f3 + golden.spacing.f1} />
        <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.subtitle,
              fontWeight: theme.typography.weight.bold,
              letterSpacing: 1,
              textAlign: 'center',
            }}
          >
            {COMPANY_NAME}
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: golden.type.small,
              fontWeight: theme.typography.weight.medium,
              textAlign: 'center',
            }}
          >
            {COMPANY_PARENT_TAG}
          </Text>
        </View>
      </View>

      <View style={{ minHeight: formMinHeight, justifyContent: 'center', gap: golden.spacing.f3 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.textPrimary,
            fontSize: golden.type.heading,
            fontWeight: theme.typography.weight.bold,
          }}
        >
          Welcome
        </Text>
        <View style={{ gap: golden.spacing.f1 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: golden.type.body,
              fontWeight: theme.typography.weight.medium,
            }}
          >
            Mobile number
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: golden.controlHeight,
              paddingHorizontal: golden.spacing.f2,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.primarySoft,
              borderWidth: 1.5,
              borderColor: errorText
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
                marginLeft: golden.spacing.f1,
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
                height: golden.spacing.f3,
                marginHorizontal: golden.spacing.f2,
                backgroundColor: theme.colors.border,
              }}
            />
            <TextInput
              value={formatMobileInput(digits)}
              onChangeText={(t) => {
                setDigits(normalizeMobile(t));
                if (serverError) setServerError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setTouched(true);
              }}
              onSubmitEditing={onContinue}
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={24} // room to paste '+91 98765 43210'; normalised to 10 digits
              placeholder="98765 43210"
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="done"
              style={{
                flex: 1,
                fontSize: theme.typography.size.subtitle,
                color: theme.colors.textPrimary,
                paddingVertical: golden.spacing.f2,
              }}
              accessibilityLabel="Mobile number, 10 digits"
            />
          </View>
          {errorText ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: theme.colors.danger, fontSize: golden.type.body }}
            >
              {errorText}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: golden.spacing.f1 }}>
              <Icon name="shield-outline" size={golden.type.body} color="primary" />
              <Text style={[bodyText, { flexShrink: 1 }]}>
                We will send a 6-digit verification code via SMS
              </Text>
            </View>
          )}
        </View>
        <Button label="Continue" rightIcon="arrow-forward" onPress={onContinue} disabled={submitting} loading={submitting} />
      </View>
    </ScreenContainer>
  );
}
