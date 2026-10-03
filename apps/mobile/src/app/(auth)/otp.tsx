/**
 * S3: OTP verification — PRD 8.3, with its error states:
 *   wrong code (attempts left) -> expired code -> too many attempts (temporary cooldown).
 *
 * PROTOTYPE verify rules (no backend yet), so each state can be reviewed:
 *   000000  -> code expired          111111 -> wrong code (3 wrong tries = cooldown)
 *   any other 6 digits -> success
 *
 * TODO (M-02):
 *  - POST /v1/auth/otp/verify; store refresh token in SecureStore, access token in memory
 *  - POST /v1/auth/otp/request for resend (resendAfterSec from the server)
 *  - map AUTH_INVALID_OTP (attemptsLeft) / AUTH_OTP_EXPIRED / AUTH_OTP_ATTEMPTS_EXCEEDED (retryAfterSec)
 *  - never show raw error codes; all strings move to i18n
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import {
  BrandHeader,
  Button,
  Card,
  Icon,
  IconTile,
  OtpInput,
  Pill,
  ProgressBar,
  ScreenContainer,
  goBackOrLogin,
} from '@/components/ui';
import { Links } from '@/constants/links';
import { maskMobile } from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { PLACEHOLDER_SUPPORT } from '@/features/profile/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 3;
const LOCK_SECONDS = 300;

type Mode = 'entry' | 'invalid' | 'expired' | 'locked';

function formatCountdown(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function OtpScreen() {
  const theme = useAppTheme();
  const { mobile, completeLogin } = useSession();
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<Mode>('entry');
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [lockLeft, setLockLeft] = useState(LOCK_SECONDS);
  const [verifying, setVerifying] = useState(false);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  // Cooldown countdown; unlocks and resets attempts when it ends
  useEffect(() => {
    if (mode !== 'locked') return;
    const id = setTimeout(() => {
      if (lockLeft <= 1) {
        setMode('entry');
        setAttemptsLeft(MAX_ATTEMPTS);
        setOtp('');
        setLockLeft(LOCK_SECONDS);
      } else {
        setLockLeft((s) => s - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [mode, lockLeft]);

  const canResend = secondsLeft === 0 || mode === 'expired';
  const canVerify = otp.length === 6 && !verifying && mode !== 'expired' && mode !== 'locked';

  function onChange(next: string) {
    setOtp(next);
    if (mode === 'invalid' || mode === 'expired') setMode('entry');
  }

  function onVerify(code: string = otp) {
    if (code.length !== 6 || verifying || mode === 'locked') return;

    if (code === '000000') {
      setMode('expired');
      return;
    }
    if (code === '111111') {
      const left = attemptsLeft - 1;
      setAttemptsLeft(left);
      if (left <= 0) {
        setLockLeft(LOCK_SECONDS);
        setMode('locked');
      } else {
        setMode('invalid');
      }
      return;
    }

    setVerifying(true);
    completeLogin();
    router.replace('/app-lock-setup');
  }

  function onResend() {
    if (!canResend) return;
    setOtp('');
    setMode('entry');
    setSecondsLeft(RESEND_SECONDS);
    // TODO (M-02): POST /v1/auth/otp/request
  }

  const caption = { color: theme.colors.textSecondary, fontSize: theme.typography.size.caption } as const;
  const locked = mode === 'locked';

  return (
    <ScreenContainer tone="canvas">
      <BrandHeader title="Verify number" showBack />

      <View style={{ gap: theme.spacing.sm }}>
        <Text
          accessibilityRole="header"
          style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold }}
        >
          Verify your number
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 }}>
          Enter the 6-digit code sent to{' '}
          <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.semibold }}>{maskMobile(mobile)}</Text>
        </Text>
        <Text
          accessibilityRole="link"
          onPress={goBackOrLogin}
          style={{ color: theme.colors.primary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.medium, paddingVertical: theme.spacing.xs }}
        >
          Change number
        </Text>
      </View>

      {/* Too many attempts: cooldown */}
      {locked ? (
        <>
          <View
            accessible
            accessibilityRole="alert"
            style={{ flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.dangerSoft }}
          >
            <IconTile name="alert" size={36} background="card" color="danger" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.colors.danger, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
                Too many attempts
              </Text>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, lineHeight: 20 }}>
                You used all {MAX_ATTEMPTS} attempts. For your security, verification is paused for a few minutes.
              </Text>
            </View>
          </View>

          <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft }}>
              <IconTile name="time-outline" size={44} background="card" color="primary" />
              <View style={{ flex: 1 }}>
                <Text style={caption}>You can try again in</Text>
                <Text
                  accessibilityLabel={`${Math.floor(lockLeft / 60)} minutes ${lockLeft % 60} seconds`}
                  style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading + 4, fontWeight: theme.typography.weight.bold }}
                >
                  {formatCountdown(lockLeft)}
                </Text>
              </View>
            </View>
            <ProgressBar ratio={lockLeft / LOCK_SECONDS} color="primary" accessibilityLabel="Time until you can try again" />
            <Text style={[caption, { lineHeight: 20 }]}>Your loan information is safe and has not changed.</Text>
          </Card>
        </>
      ) : null}

      {/* Code entry */}
      <View style={{ gap: theme.spacing.md }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold, letterSpacing: 0.6 }}>
          ONE-TIME PASSWORD (OTP)
        </Text>
        <OtpInput
          value={otp}
          onChange={onChange}
          onComplete={(code) => onVerify(code)}
          hasError={mode === 'invalid' || locked}
          disabled={locked}
          autoFocus={!locked}
        />

        {mode === 'invalid' ? (
          <View accessible accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="alert-circle" size={18} color="danger" />
            <Text style={{ flex: 1, color: theme.colors.danger, fontSize: theme.typography.size.caption + 1 }}>
              That code isn&apos;t right. {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left.
            </Text>
          </View>
        ) : null}

        {mode === 'expired' ? (
          <View
            accessible
            accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.warningSoft }}
          >
            <Icon name="time-outline" size={18} color="warning" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, fontWeight: theme.typography.weight.semibold }}>
                This code has expired
              </Text>
              <Text style={caption}>Codes work for a short time only. Request a new one to continue.</Text>
            </View>
          </View>
        ) : null}

        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="alert-circle" size={18} color="danger" />
            <Text style={{ flex: 1, color: theme.colors.danger, fontSize: theme.typography.size.caption + 1 }}>
              The last code wasn&apos;t right. You can enter a new one when the timer ends.
            </Text>
          </View>
        ) : null}
      </View>

      {!locked ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="time-outline" size={20} color="textSecondary" />
              <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
                {canResend ? 'You can request a new code' : 'Resend code in '}
                {canResend ? null : (
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.bold }}>{formatCountdown(secondsLeft)}</Text>
                )}
              </Text>
            </View>
            <Button label="Resend OTP" variant="ghost" onPress={onResend} disabled={!canResend} />
          </View>

          {mode === 'expired' ? (
            <Button label="Send a new code" leftIcon="refresh" onPress={onResend} />
          ) : (
            <Button label="Verify & Proceed" rightIcon="arrow-forward" onPress={() => onVerify()} disabled={!canVerify} loading={verifying} />
          )}

          <View style={{ alignItems: 'center' }}>
            <Pill icon="checkmark-circle-outline" label="SMS autofill supported" color="success" background="canvas" />
          </View>
        </>
      ) : null}

      {/* Help: always available, and the way out while locked */}
      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="help-circle-outline" size={22} color="textSecondary" />
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.semibold }}>
            {locked ? 'Need help signing in?' : "Didn't receive the code?"}
          </Text>
        </View>
        <Text style={[caption, { lineHeight: 20 }]}>
          {locked
            ? 'Support can help you sign in, or you can use a different number.'
            : 'Network delays can happen. You can also reach support:'}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            label="WhatsApp"
            variant="secondary"
            leftIcon="logo-whatsapp"
            style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
            onPress={() => Linking.openURL(Links.supportWhatsApp)}
          />
          <Button
            label="Call support"
            variant="secondary"
            leftIcon="call-outline"
            style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
            onPress={() => Linking.openURL(Links.supportPhone)}
          />
        </View>
        <Text style={[caption, { textAlign: 'center' }]}>Toll-free {PLACEHOLDER_SUPPORT.phoneDisplay}</Text>
        {locked ? <Button label="Change mobile number" variant="ghost" leftIcon="create-outline" onPress={goBackOrLogin} /> : null}
      </Card>

      <View style={{ flex: 1, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, alignSelf: 'center' }}>
        <Icon name="lock-closed-outline" size={14} color="success" />
        <Text style={caption}>256-bit encrypted session</Text>
      </View>
    </ScreenContainer>
  );
}
