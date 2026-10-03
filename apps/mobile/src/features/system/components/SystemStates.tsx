/**
 * Reusable system states: offline banner, load error, no loans, no transactions, support sheet.
 * Calm, friendly copy. No status codes, stack traces or internal messages.
 *
 * TODO (M-05/M-08): lender name, contacts and masked mobile from GET /v1/config and /v1/me; i18n
 */
import { Linking, Pressable, Text, View } from 'react-native';

import { BottomSheet, Button, Card, Icon, IconTile, StateView } from '@/components/ui';
import { Links } from '@/constants/links';
import { maskMobile } from '@/features/auth/format';
import { useSession } from '@/features/auth/session';
import { PLACEHOLDER_LENDER, PLACEHOLDER_SUPPORT } from '@/features/profile/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

import { useIsOffline } from '../connectivity';

/* ----------------------------- Offline banner ----------------------------- */

/** Persistent, lightweight. Renders nothing while online. */
export function OfflineBanner() {
  const theme = useAppTheme();
  const offline = useIsOffline();
  if (!offline) return null;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel="You're offline. Some information may not be up to date."
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.primarySoft,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="cloud-offline-outline" size={20} color="textSecondary" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
          You&apos;re offline
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          Some information may not be up to date.
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------ Load error ------------------------------ */

export function LoadErrorState({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) {
  const theme = useAppTheme();
  return (
    <StateView
      icon="wifi-outline"
      badge="alert-circle"
      title="Something went wrong"
      message="We couldn't load your loan information. Please check your internet connection and try again."
      primary={{ label: 'Try again', icon: 'refresh', onPress: onRetry, loading: retrying }}
      secondary={{ label: 'Contact support', icon: 'headset-outline', onPress: () => Linking.openURL(Links.supportPhone) }}
    >
      <Card tone="card" style={{ alignSelf: 'stretch', borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Icon name="shield-checkmark-outline" size={18} color="textSecondary" />
          <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
            Your loan records are safe and have not changed. If this keeps happening, please contact support.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>Toll-free assistance</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
              {PLACEHOLDER_SUPPORT.phoneDisplay}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call support"
            onPress={() => Linking.openURL(Links.supportPhone)}
            style={({ pressed }) => ({
              width: theme.touchTarget.min,
              height: theme.touchTarget.min,
              borderRadius: theme.touchTarget.min / 2,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="call-outline" size={20} color="primary" />
          </Pressable>
        </View>
      </Card>
    </StateView>
  );
}

/* -------------------------------- No loans -------------------------------- */

export function NoLoansState({ onRefresh, refreshing }: { onRefresh: () => void; refreshing?: boolean }) {
  const theme = useAppTheme();
  const { mobile } = useSession();
  const linked = mobile ? maskMobile(mobile) : '+91 98XXXXX002';

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.xl }}>
        <StateView
          icon="business-outline"
          badge="checkmark-circle"
          title="No loan accounts found"
          message={
            <>
              We couldn&apos;t find any loan accounts linked to{' '}
              <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.semibold }}>{linked}</Text>
              . If you believe this is incorrect, contact support.
            </>
          }
          primary={{ label: 'Contact support', icon: 'headset-outline', onPress: () => Linking.openURL(Links.supportPhone) }}
          secondary={{ label: 'Refresh', icon: 'sync-outline', onPress: onRefresh }}
        />
        {refreshing ? (
          <Text accessibilityLiveRegion="polite" style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            Checking again...
          </Text>
        ) : null}
      </Card>

      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
        <InfoRow icon="phone-portrait-outline" label="Linked mobile" value={linked} />
        <InfoRow icon="business-outline" label="Lender" value={PLACEHOLDER_LENDER.legalName} />
        <InfoRow icon="lock-closed-outline" label="Access" value="Read-only" />
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xs }}>
        <Icon name="information-circle-outline" size={18} color="textSecondary" />
        <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
          This app displays loan records only. Loan applications and approvals are handled by your lender.
        </Text>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: 'phone-portrait-outline' | 'business-outline' | 'lock-closed-outline'; label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.canvas,
      }}
    >
      <Icon name={icon} size={18} color="textSecondary" />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right', color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, fontWeight: theme.typography.weight.semibold }}>
        {value}
      </Text>
    </View>
  );
}

/* ---------------------------- No transactions ---------------------------- */

export function NoTransactionsState({ onHelp }: { onHelp: () => void }) {
  const theme = useAppTheme();
  return (
    <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.xl, gap: theme.spacing.lg }}>
      <StateView
        icon="receipt-outline"
        badge="time-outline"
        title="No transactions yet"
        message="Your loan activity will appear here."
      >
        <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft }}>
          <Tip icon="sync-outline" text="Payments appear here after your lender records them." />
          <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          <Tip icon="business-outline" text="Cash paid at a branch shows up once the branch records it." />
        </View>
      </StateView>
      <Button label="Need help with a recent payment?" variant="secondary" leftIcon="headset-outline" onPress={onHelp} />
    </Card>
  );
}

function Tip({ icon, text }: { icon: 'sync-outline' | 'business-outline'; text: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <Icon name={icon} size={18} color="primary" />
      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

/* ------------------------------ Support sheet ------------------------------ */

export function SupportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Payment questions">
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 }}>
        If you paid recently and do not see it yet, your lender can check the payment for you.
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        <SupportRow icon="call-outline" label="Call support" value={PLACEHOLDER_SUPPORT.phoneDisplay} onPress={() => Linking.openURL(Links.supportPhone)} />
        <SupportRow icon="mail-outline" label="Email" value={PLACEHOLDER_SUPPORT.email} onPress={() => Linking.openURL(Links.supportEmail)} />
      </View>
      <Button label="Close" variant="secondary" onPress={onClose} />
    </BottomSheet>
  );
}

function SupportRow({ icon, label, value, onPress }: { icon: 'call-outline' | 'mail-outline'; label: string; value: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.primarySoft,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconTile name={icon} size={36} background="card" color="primary" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>{label}</Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>{value}</Text>
      </View>
      <Icon name="chevron-forward" size={18} color="textSecondary" />
    </Pressable>
  );
}
