/**
 * S3: OTP verification — PRD 8.3.
 *
 * LIVE mode (EXPO_PUBLIC_API_MODE=live):
 *   - POST /api/v1/auth/otp/verify with { mobileNumber, otp, deviceId }.
 *   - `authenticated` -> await completeLogin(tokens) -> route guards -> /loans.
 *   - `date_of_birth_required` -> a DOB sub-step (three DD/MM/YYYY numeric fields), re-verify
 *     with the same OTP + dateOfBirth.
 *   - Wrong/expired/used OTP, wrong DOB, and the 15-minute server lock all collapse into ONE
 *     non-revealing message. NO client attempts counter, NO client lock timer (the server owns
 *     the lock). The resend countdown is a UI minimum; a server 429 extends the friendly wait.
 *   - DOB is NEVER logged or persisted (component state only, for the verify call).
 *
 * MOCK mode: the full three-mode prototype (000000 -> expired, 111111 -> wrong/cooldown) is kept
 * so every state stays reviewable without a backend.
 */
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  Icon,
  IconTile,
  OtpInput,
  ProgressBar,
  ScreenContainer,
  goBackOrLogin,
} from '@/components/ui';
import { apiMode } from '@/features/api/config';
import * as endpoints from '@/features/api/endpoints';
import { friendlyMessageKey } from '@/features/api/errors';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import { extractOtp, maskMobile } from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { parseIsoDate, todayIST } from '@app/shared';
import { useAppTheme } from '@/hooks/use-theme';
import { logger } from '@/lib/logger';

const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 3;
const LOCK_SECONDS = 300;

const LIVE = apiMode() === 'live';

type Mode = 'entry' | 'invalid' | 'expired' | 'locked';
type LiveStep = 'otp' | 'dob';

function formatCountdown(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Resend block: "Didn't receive code?" with a "Resend" link underneath. While the countdown runs
 * the link is dimmed and shows the time left ("Resend - 00:30"); when it ends it turns into a
 * tappable link. Centred, so it can never be pushed off-screen by a longer label.
 */
function ResendRow({
  canResend,
  secondsLeft,
  onResend,
}: {
  canResend: boolean;
  secondsLeft: number;
  onResend: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const size = theme.golden.type.body;
  return (
    <View style={{ alignItems: 'center', gap: theme.golden.spacing.f1 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: size }}>{t('otp.didntReceive')}</Text>
      <Pressable
        onPress={onResend}
        disabled={!canResend}
        accessibilityRole="button"
        accessibilityLabel={canResend ? t('otp.resendA11y') : t('otp.resendInA11y', { seconds: secondsLeft })}
        accessibilityState={{ disabled: !canResend }}
        style={{ minHeight: theme.touchTarget.min, justifyContent: 'center', paddingHorizontal: theme.spacing.md }}
      >
        <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: size }}>
          <Text
            style={{
              color: canResend ? theme.colors.interactive : theme.colors.textSecondary,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            {t('otp.resend')}
          </Text>
          {canResend ? null : ` - ${formatCountdown(secondsLeft)}`}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * "Paste code": reads the clipboard ONLY when the user taps it (never silently) and fills the
 * boxes if it holds a 6-digit code, e.g. after tapping "Copy code" on the WhatsApp message.
 * The clipboard text and the code are never logged.
 */
function PasteCodeButton({ onCode, disabled }: { onCode: (code: string) => void; disabled?: boolean }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [hintKey, setHintKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPress() {
    if (busy || disabled) return;
    setBusy(true);
    setHintKey(null);
    try {
      const code = extractOtp(await Clipboard.getStringAsync());
      if (code) onCode(code);
      else setHintKey('otp.pasteNone');
    } catch {
      logger.warn('otp', 'paste_failed');
      setHintKey('otp.pasteFail');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Button label={t('otp.pasteCode')} variant="ghost" leftIcon="clipboard-outline" fullWidth={false} onPress={() => void onPress()} disabled={disabled || busy} />
      {hintKey ? (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: theme.golden.type.small + 1, textAlign: 'center' }}>
          {t(hintKey)}
        </Text>
      ) : null}
    </View>
  );
}
/** Centred title + instruction + masked number with an edit icon (replaces the old header/back). */
function OtpHeading({
  mobile,
  onChangeNumber,
  title,
  subtitle,
  showNumber = true,
}: {
  mobile: string | null;
  onChangeNumber: () => void;
  title?: string;
  subtitle?: string;
  showNumber?: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const g = theme.golden;
  return (
    <View style={{ alignItems: 'center', gap: g.spacing.f1 }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textPrimary,
          fontSize: g.type.heading,
          fontWeight: theme.typography.weight.bold,
          textAlign: 'center',
        }}
      >
        {title ?? t('otp.title')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: g.type.body, lineHeight: g.lineHeight.body, textAlign: 'center' }}>
        {subtitle ?? t('otp.subtitle')}
      </Text>
      {showNumber ? (
        <Pressable
          onPress={onChangeNumber}
          accessibilityRole="button"
          accessibilityLabel={t('otp.changeNumberA11y', { mobile: maskMobile(mobile) })}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: g.spacing.f1, minHeight: theme.touchTarget.min }}
        >
          <Text style={{ color: theme.colors.textPrimary, fontSize: g.type.body + 2, fontWeight: theme.typography.weight.semibold }}>
            {maskMobile(mobile)}
          </Text>
          <Icon name="create-outline" size={20} color="interactive" />
        </Pressable>
      ) : null}
    </View>
  );
}
export default function OtpScreen() {
  useSecureScreen();
  const { mobile } = useSession();
  // The session stores `+91XXXXXXXXXX`; the API wants the bare 10-digit number.
  const mobileDigits = (mobile ?? '').replace(/\D/g, '').slice(-10);

  if (LIVE) return <LiveOtp mobileDigits={mobileDigits} mobile={mobile} />;
  return <MockOtp mobile={mobile} />;
}

/* ------------------------------- LIVE path -------------------------------- */

function LiveOtp({ mobileDigits, mobile }: { mobileDigits: string; mobile: string | null }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { completeLogin, startLogin } = useSession();
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<LiveStep>('otp');
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // DOB sub-step fields (never logged, never persisted).
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [dobError, setDobError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const canResend = secondsLeft === 0 && !verifying;
  const canVerify = otp.length === 6 && !verifying;

  async function submitVerify(dateOfBirth?: string) {
    if (verifying) return;
    setVerifying(true);
    setMessage(null);
    const res = await endpoints.otpVerify({ mobileNumber: mobileDigits, otp, dateOfBirth });
    setVerifying(false);

    if (!res.ok) {
      if (res.error.kind === 'UNAUTHORIZED') setMessage(t('otp.wrongCode'));
      else if (res.error.kind === 'BAD_REQUEST') setMessage(t('otp.wrongCode'));
      else setMessage(t(friendlyMessageKey(res.error)));
      return;
    }

    if (res.data.status === 'authenticated') {
      if (mobileDigits) {
        startLogin(`+91${mobileDigits}`);
      }
      // Resolves once tokens are saved; the route guards then move the user to /loans.
      await completeLogin({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        expiresInSeconds: res.data.expiresInSeconds,
      });
      return;
    }

    // date_of_birth_required — keep the same OTP, switch to the DOB sub-step.
    setStep('dob');
  }

  function onOtpChange(next: string) {
    setOtp(next);
    if (message) setMessage(null);
  }

  function onSubmitDob() {
    setDobError(null);
    const day = dd.padStart(2, '0');
    const month = mm.padStart(2, '0');
    const year = yyyy;
    if (year.length !== 4 || !month || !day) {
      setDobError(t('otp.dobFormat'));
      return;
    }
    const iso = `${year}-${month}-${day}`;
    try {
      parseIsoDate(iso);
    } catch {
      setDobError(t('otp.dobInvalid'));
      return;
    }
    const y = Number(year);
    const currentYear = Number(todayIST().slice(0, 4));
    if (y < 1900 || y > currentYear) {
      setDobError(t('otp.dobInvalid'));
      return;
    }
    if (iso > todayIST()) {
      setDobError(t('otp.dobFuture'));
      return;
    }
    void submitVerify(iso);
  }

  async function onResend() {
    if (!canResend) return;
    setOtp('');
    setMessage(null);
    setSecondsLeft(RESEND_SECONDS);
    const res = await endpoints.otpRequest(mobileDigits);
    if (!res.ok && res.error.kind === 'RATE_LIMITED') {
      setMessage(t(friendlyMessageKey(res.error)));
    }
  }

  return (
    <ScreenContainer
      tone="canvas"
      scrollToEndOnKeyboard
      contentStyle={{ justifyContent: 'center' }}
    >
      {step === 'otp' ? (
        <OtpHeading mobile={mobile} onChangeNumber={goBackOrLogin} />
      ) : (
        <>
          <OtpHeading
            mobile={mobile}
            onChangeNumber={() => setStep('otp')}
            title={t('otp.dobTitle')}
            subtitle={t('otp.dobSubtitle')}
            showNumber={false}
          />
          <Text
            accessibilityRole="link"
            onPress={() => setStep('otp')}
            style={{ color: theme.colors.interactive, fontSize: theme.golden.type.body, fontWeight: theme.typography.weight.medium, textAlign: 'center', paddingVertical: theme.spacing.xs }}
          >
            {t('otp.backToCode')}
          </Text>
        </>
      )}
      {step === 'otp' ? (
        <View style={{ gap: theme.spacing.md }}>
          <OtpInput
            value={otp}
            onChange={onOtpChange}
            hasError={message !== null}
            autoFocus
          />
          {message ? (
            <View accessible accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="alert-circle" size={18} color="danger" />
              <Text style={{ flex: 1, color: theme.colors.danger, fontSize: theme.typography.size.caption + 1 }}>{message}</Text>
            </View>
          ) : null}

          <PasteCodeButton onCode={onOtpChange} disabled={verifying} />

          <Button label={t('otp.verify')} onPress={() => void submitVerify()} disabled={!canVerify} loading={verifying} />

          <ResendRow canResend={canResend} secondsLeft={secondsLeft} onResend={onResend} />
        </View>
      ) : (
        <DobStep
          dd={dd}
          mm={mm}
          yyyy={yyyy}
          setDd={(v) => { setDd(v); if (dobError) setDobError(null); }}
          setMm={(v) => { setMm(v); if (dobError) setDobError(null); }}
          setYyyy={(v) => { setYyyy(v); if (dobError) setDobError(null); }}
          error={dobError ?? message}
          submitting={verifying}
          onSubmit={onSubmitDob}
        />
      )}

    </ScreenContainer>
  );
}

function DobStep({
  dd,
  mm,
  yyyy,
  setDd,
  setMm,
  setYyyy,
  error,
  submitting,
  onSubmit,
}: {
  dd: string;
  mm: string;
  yyyy: string;
  setDd: (v: string) => void;
  setMm: (v: string) => void;
  setYyyy: (v: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

  const fieldStyle = {
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1.5,
    borderColor: error ? theme.colors.danger : 'transparent',
    fontSize: theme.typography.size.subtitle,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
    fontWeight: theme.typography.weight.semibold,
  };
  const label = { color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium } as const;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold, letterSpacing: theme.tracking(0.6) }}>
        {t('otp.dobLabel')}
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text style={label}>{t('otp.day')}</Text>
          <TextInput value={dd} onChangeText={(v) => setDd(digits(v, 2))} keyboardType="number-pad" maxLength={2} placeholder="DD" placeholderTextColor={theme.colors.textSecondary} style={fieldStyle} accessibilityLabel={t('otp.dayA11y')} />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text style={label}>{t('otp.month')}</Text>
          <TextInput value={mm} onChangeText={(v) => setMm(digits(v, 2))} keyboardType="number-pad" maxLength={2} placeholder="MM" placeholderTextColor={theme.colors.textSecondary} style={fieldStyle} accessibilityLabel={t('otp.monthA11y')} />
        </View>
        <View style={{ flex: 1.3, gap: theme.spacing.xs }}>
          <Text style={label}>{t('otp.year')}</Text>
          <TextInput value={yyyy} onChangeText={(v) => setYyyy(digits(v, 4))} keyboardType="number-pad" maxLength={4} placeholder="YYYY" placeholderTextColor={theme.colors.textSecondary} style={fieldStyle} accessibilityLabel={t('otp.yearA11y')} />
        </View>
      </View>
      {error ? (
        <View accessible accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="alert-circle" size={18} color="danger" />
          <Text style={{ flex: 1, color: theme.colors.danger, fontSize: theme.typography.size.caption + 1 }}>{error}</Text>
        </View>
      ) : null}
      <Button label={t('otp.confirm')} rightIcon="arrow-forward" onPress={onSubmit} disabled={submitting} loading={submitting} />
    </View>
  );
}

/* ------------------------------- MOCK path -------------------------------- */

function MockOtp({ mobile }: { mobile: string | null }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { completeLogin } = useSession();
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<Mode>('entry');
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [lockLeft, setLockLeft] = useState(LOCK_SECONDS);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

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
    void completeLogin(); // route guards move the user to /loans
  }

  function onResend() {
    if (!canResend) return;
    setOtp('');
    setMode('entry');
    setSecondsLeft(RESEND_SECONDS);
  }

  const caption = { color: theme.colors.textSecondary, fontSize: theme.typography.size.caption } as const;
  const locked = mode === 'locked';

  return (
    <ScreenContainer
      tone="canvas"
      scrollToEndOnKeyboard
      contentStyle={{ justifyContent: 'center' }}
    >
      <OtpHeading mobile={mobile} onChangeNumber={goBackOrLogin} />

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

      <View style={{ gap: theme.spacing.md }}>
        <OtpInput
          value={otp}
          onChange={onChange}
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
          <PasteCodeButton onCode={onChange} disabled={verifying || mode === 'expired'} />

          {mode === 'expired' ? (
            <Button label="Send a new code" leftIcon="refresh" onPress={onResend} />
          ) : (
            <Button label={t('otp.verify')} onPress={() => onVerify()} disabled={!canVerify} loading={verifying} />
          )}

          <ResendRow canResend={canResend} secondsLeft={secondsLeft} onResend={onResend} />
        </>
      ) : null}

      {locked ? (
        <Button label="Change mobile number" variant="ghost" leftIcon="create-outline" onPress={goBackOrLogin} />
      ) : null}
    </ScreenContainer>
  );
}
