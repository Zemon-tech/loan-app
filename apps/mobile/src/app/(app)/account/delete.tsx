/**
 * S10: Delete my account — PRD 8.10. Three calm steps in one screen:
 *   review (what happens) -> verify (biometrics or OTP) -> request received.
 * Deleting the app profile never cancels loans; records are kept as the law requires.
 *
 * TODO (M-09):
 *  - verify OTP via POST /v1/auth/otp/verify, then DELETE /v1/me
 *  - lender name and legal retention wording from GET /v1/config (legal to approve the copy)
 *  - strings to i18n
 */
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import {
  BottomSheet,
  Button,
  Card,
  Icon,
  IconTile,
  OtpInput,
  Pill,
  ProgressBar,
  ScreenContainer,
  ScreenHeader,
  type IconName,
} from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { maskMobile } from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { PLACEHOLDER_LOANS, summarize } from '@/features/loans/placeholderData';
import { formatDate } from '@/features/loans/format';
import { PLACEHOLDER_GRIEVANCE_OFFICER as OFFICER, PLACEHOLDER_LENDER } from '@/features/profile/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

type Step = 'review' | 'verify' | 'done';

const RESEND_SECONDS = 30;

export default function DeleteAccountScreen() {
  const theme = useAppTheme();
  const { mobile, logout } = useSession();
  const [step, setStep] = useState<Step>('review');
  const [understood, setUnderstood] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState<{ number: string; when: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [officerOpen, setOfficerOpen] = useState(false);

  const activeLoanCount = summarize(PLACEHOLDER_LOANS).activeLoans.length;

  useEffect(() => {
    if (!useOtp || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [useOtp, secondsLeft]);

  function keepAccount() {
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  }

  async function verifyWithBiometrics() {
    setBusy(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
      if (!enrolled) {
        Alert.alert('Biometrics not available', 'Please verify with an OTP instead.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm account deletion' });
      if (result.success) submitRequest();
    } catch {
      Alert.alert('Biometrics not available', 'Please verify with an OTP instead.');
    } finally {
      setBusy(false);
    }
  }

  function submitRequest() {
    // TODO (M-09): DELETE /v1/me; the acknowledgement number and time come from the response.
    const now = new Date();
    const h = now.getHours();
    const time = `${String(h % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    setAck({
      number: `DEL-${now.getFullYear()}-${String(Math.floor(10000 + Math.random() * 89999))}`,
      when: `${formatDate(now)}, ${time}`,
    });
    setStep('done');
  }

  async function copyAck() {
    if (!ack) return;
    await Clipboard.setStringAsync(ack.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function finish() {
    logout();
    router.replace('/login');
  }

  const bodyText = { color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 } as const;

  /* ------------------------------ Done ------------------------------ */
  if (step === 'done') {
    return (
      <ScreenContainer tone="canvas">
        <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.lg }}>
          <IconTile name="shield-checkmark" size={80} background="successSoft" color="success" />
          <Pill dot="success" label="Request received" color="success" background="successSoft" uppercase />
          <Text
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold }}
          >
            Request received
          </Text>
          <Text style={[bodyText, { textAlign: 'center' }]}>
            Your app access has been removed.{'\n'}Loan records are retained as required by law.
          </Text>
        </View>

        {ack ? (
          <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: 0, gap: 0, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md, backgroundColor: theme.colors.primarySoft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Icon name="receipt-outline" size={20} color="primary" />
                <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
                  Acknowledgement details
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy acknowledgement number"
                onPress={copyAck}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: theme.spacing.sm }}
              >
                <Icon name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? 'success' : 'primary'} />
                <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold }}>
                  {copied ? 'Copied' : 'Copy ID'}
                </Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <AckRow label="Acknowledgement number" value={ack.number} first />
              <AckRow label="Date & time" value={ack.when} />
              <AckRow label="Registered entity" value={PLACEHOLDER_LENDER.legalName} />
            </View>
          </Card>
        ) : null}

        <Point icon="archive-outline" fg="textSecondary" bg="primarySoft" title="Records retained by law">
          Your loan agreements, ledger balances and transaction records are kept by your lender for the period required by law.
        </Point>
        <Point icon="information-circle-outline" fg="primary" bg="primarySoft" title="Your loans continue">
          Active loans stay in force. EMI obligations are handled directly with your lending branch.
        </Point>

        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Return to login" onPress={finish} />
          <Button label="Contact Grievance Officer" variant="ghost" leftIcon="headset-outline" onPress={() => setOfficerOpen(true)} />
        </View>

        <BottomSheet visible={officerOpen} onClose={() => setOfficerOpen(false)} title="Grievance Redressal Desk">
          <Text style={[bodyText, { fontSize: theme.typography.size.caption + 1, lineHeight: 20 }]}>
            For questions after deletion, or to confirm what is retained, contact the appointed officer.
          </Text>
          <View style={{ gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}>
            <AckRow label="Officer" value={OFFICER.name} first />
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${OFFICER.email}`)}>
              <AckRow label="Email" value={OFFICER.email} link />
            </Pressable>
            <AckRow label="Desk hours" value={OFFICER.workingHours} />
          </View>
          <Button label="Close" variant="secondary" onPress={() => setOfficerOpen(false)} />
        </BottomSheet>
      </ScreenContainer>
    );
  }

  /* ----------------------------- Verify ----------------------------- */
  if (step === 'verify') {
    return (
      <ScreenContainer tone="canvas">
        <ScreenHeader title="Delete Account" onBack={() => (useOtp ? setUseOtp(false) : setStep('review'))} />
        <StepBar label="Step 2 of 2" trailing="Verify it's you" ratio={1} />

        <View style={{ gap: theme.spacing.sm }}>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold }}>
            Verify it&apos;s you
          </Text>
          <Text style={bodyText}>
            {useOtp
              ? `Enter the 6-digit code sent to ${mobile ? maskMobile(mobile) : '+91 98XXXXX002'}.`
              : 'Confirm with your device, or use a one-time code sent by SMS.'}
          </Text>
        </View>

        {useOtp ? (
          <>
            <OtpInput value={otp} onChange={setOtp} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Icon name="time-outline" size={20} color="textSecondary" />
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
                  {secondsLeft > 0 ? `Resend code in 00:${String(secondsLeft).padStart(2, '0')}` : 'You can request a new code'}
                </Text>
              </View>
              <Button
                label="Resend"
                variant="ghost"
                disabled={secondsLeft > 0}
                onPress={() => {
                  setOtp('');
                  setSecondsLeft(RESEND_SECONDS);
                }}
              />
            </View>
            <Button
              label="Confirm deletion request"
              variant="danger"
              disabled={otp.length !== 6}
              onPress={submitRequest}
            />
          </>
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            <Button label="Use biometrics" leftIcon="finger-print" onPress={verifyWithBiometrics} loading={busy} />
            <Button label="Use OTP instead" variant="secondary" leftIcon="chatbubble-ellipses-outline" onPress={() => { setUseOtp(true); setSecondsLeft(RESEND_SECONDS); setOtp(''); }} disabled={busy} />
          </View>
        )}

        <Button label="Keep my account" variant="ghost" onPress={keepAccount} />
      </ScreenContainer>
    );
  }

  /* ----------------------------- Review ----------------------------- */
  return (
    <ScreenContainer tone="canvas">
      <ScreenHeader title="Delete Account" />
      <StepBar label="Step 1 of 2" trailing="Review terms" ratio={0.5} />

      <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
          <IconTile name="shield-half-outline" size={52} background="dangerSoft" color="danger" />
        </View>
        <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold, textAlign: 'center' }}>
          Delete your account
        </Text>
        <Text style={[bodyText, { textAlign: 'center' }]}>
          Please review what happens when you request account deletion from Loan Tracker.
        </Text>
      </View>

      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <IconTile name="business-outline" size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>Registered entity</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
              {PLACEHOLDER_LENDER.legalName}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.canvas }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>Active lending portfolios</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.bold }}>
            {activeLoanCount} active {activeLoanCount === 1 ? 'loan' : 'loans'}
          </Text>
        </View>
      </Card>

      <Point icon="person-remove-outline" fg="danger" bg="dangerSoft" title="Application access will be permanently revoked" titleColor="danger">
        You will no longer be able to log in or inspect your loan schedules using this mobile app.
      </Point>
      <Point icon="scale-outline" fg="textSecondary" bg="primarySoft" title="Active loan obligations remain legally binding">
        {`Deleting this mobile app profile does NOT cancel, waive, or close any active loans or EMI repayment obligations with ${PLACEHOLDER_LENDER.legalName}`}
      </Point>
      <Point icon="document-lock-outline" fg="primary" bg="primarySoft" title="Financial records retained as required by law" badge="Legal requirement">
        Your loan contracts, sanction letters and transaction records may need to be retained for the period required by law.
      </Point>
      <Point icon="refresh-outline" fg="textSecondary" bg="primarySoft" title="Deletion cannot be undone">
        If you wish to use the app in future, you will need to re-verify your registered mobile number with your lending branch.
      </Point>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: understood }}
        onPress={() => setUnderstood((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          minHeight: theme.touchTarget.min,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.primarySoft,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Icon name={understood ? 'checkbox' : 'square-outline'} size={26} color={understood ? 'danger' : 'textSecondary'} />
        <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, lineHeight: 20 }}>
          I understand that my active loan obligations and statutory records remain active under Indian banking regulations.
        </Text>
      </Pressable>

      <View style={{ gap: theme.spacing.sm }}>
        <Button label="Continue with deletion" variant="danger" rightIcon="arrow-forward" disabled={!understood} onPress={() => setStep('verify')} />
        <Button label="Keep my account" variant="secondary" onPress={keepAccount} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Icon name="shield-checkmark-outline" size={16} color="textSecondary" />
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
          Your request is handled securely
        </Text>
      </View>
    </ScreenContainer>
  );
}

function StepBar({ label, trailing, ratio }: { label: string; trailing: string; ratio: number }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <ProgressBar ratio={ratio} accessibilityLabel={label} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {label}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>{trailing}</Text>
      </View>
    </View>
  );
}

function Point({
  icon,
  fg,
  bg,
  title,
  titleColor = 'textPrimary',
  badge,
  children,
}: {
  icon: IconName;
  fg: AppColorRole;
  bg: AppColorRole;
  title: string;
  titleColor?: AppColorRole;
  badge?: string;
  children: string;
}) {
  const theme = useAppTheme();
  return (
    <Card tone="card" style={{ flexDirection: 'row', gap: theme.spacing.md, borderRadius: theme.radius.lg, padding: theme.spacing.lg }}>
      <IconTile name={icon} size={40} background={bg} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.colors[titleColor], fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
          {title}
        </Text>
        {badge ? (
          <View style={{ alignSelf: 'flex-start', paddingVertical: 1, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }}>
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>{badge}</Text>
          </View>
        ) : null}
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1, lineHeight: 20 }}>{children}</Text>
      </View>
    </Card>
  );
}

function AckRow({ label, value, first, link }: { label: string; value: string; first?: boolean; link?: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.lg,
        minHeight: 44,
        paddingVertical: theme.spacing.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text style={{ flexShrink: 0, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1 }}>{label}</Text>
      <Text
        selectable={!link}
        style={{
          flex: 1,
          textAlign: 'right',
          color: link ? theme.colors.primary : theme.colors.textPrimary,
          fontSize: theme.typography.size.caption + 1,
          fontWeight: theme.typography.weight.semibold,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
