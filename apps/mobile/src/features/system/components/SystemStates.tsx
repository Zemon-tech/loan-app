/**
 * Reusable system states: offline banner, load error, no loans, no transactions, support sheet.
 * Calm, friendly copy. No status codes, stack traces or internal messages.
 *
 * TODO (M-05/M-08): lender name, contacts and masked mobile from GET /v1/config and /v1/me; i18n
 */
import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const offline = useIsOffline();
  if (!offline) return null;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={t('states.offlineA11y')}
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
          {t('states.offlineTitle')}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          {t('states.offlineMsg')}
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------ Load error ------------------------------ */

export function LoadErrorState({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  return (
    <StateView
      icon="wifi-outline"
      badge="alert-circle"
      title={t('states.errorTitle')}
      message={t('states.errorMsg')}
      primary={{ label: t('common.tryAgain'), icon: 'refresh', onPress: onRetry, loading: retrying }}
      secondary={{ label: t('common.contactSupport'), icon: 'headset-outline', onPress: () => Linking.openURL(Links.supportPhone) }}
    >
      <Card tone="card" style={{ alignSelf: 'stretch', borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Icon name="shield-checkmark-outline" size={18} color="textSecondary" />
          <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
            {t('states.errorSafe')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>{t('states.tollFree')}</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
              {PLACEHOLDER_SUPPORT.phoneDisplay}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('states.callSupport')}
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
  const { t } = useTranslation();
  const { mobile } = useSession();
  const linked = mobile ? maskMobile(mobile) : '+91 98XXXXX002';

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.xl }}>
        <StateView
          icon="business-outline"
          badge="checkmark-circle"
          title={t('states.noLoansTitle')}
          message={
            <>
              {t('states.noLoansBefore')}{' '}
              <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.semibold }}>{linked}</Text>
              {t('states.noLoansEnd')} {t('states.noLoansAfter')}
            </>
          }
          primary={{ label: t('common.contactSupport'), icon: 'headset-outline', onPress: () => Linking.openURL(Links.supportPhone) }}
          secondary={{ label: t('common.refresh'), icon: 'sync-outline', onPress: onRefresh }}
        />
        {refreshing ? (
          <Text accessibilityLiveRegion="polite" style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            {t('states.checking')}
          </Text>
        ) : null}
      </Card>

      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
        <InfoRow icon="phone-portrait-outline" label={t('states.linkedMobile')} value={linked} />
        <InfoRow icon="business-outline" label={t('states.lender')} value={PLACEHOLDER_LENDER.legalName} />
        <InfoRow icon="lock-closed-outline" label={t('states.access')} value={t('states.readOnly')} />
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xs }}>
        <Icon name="information-circle-outline" size={18} color="textSecondary" />
        <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
          {t('states.noLoansFoot')}
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
  const { t } = useTranslation();
  return (
    <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.xl, gap: theme.spacing.lg }}>
      <StateView
        icon="receipt-outline"
        badge="time-outline"
        title={t('states.noTxTitle')}
        message={t('states.noTxMsg')}
      >
        <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft }}>
          <Tip icon="sync-outline" text={t('states.tip1')} />
          <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          <Tip icon="business-outline" text={t('states.tip2')} />
        </View>
      </StateView>
      <Button label={t('states.helpBtn')} variant="secondary" leftIcon="headset-outline" onPress={onHelp} />
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
  const { t } = useTranslation();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('states.supportTitle')}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 }}>
        {t('states.supportBody')}
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        <SupportRow icon="call-outline" label={t('states.callSupport')} value={PLACEHOLDER_SUPPORT.phoneDisplay} onPress={() => Linking.openURL(Links.supportPhone)} />
        <SupportRow icon="mail-outline" label={t('states.email')} value={PLACEHOLDER_SUPPORT.email} onPress={() => Linking.openURL(Links.supportEmail)} />
      </View>
      <Button label={t('common.close')} variant="secondary" onPress={onClose} />
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
