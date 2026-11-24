/**
 * S6: Loan Overview. Answers: how much do I owe, why, what have I paid.
 * NO payment button, link, UPI or QR anywhere (tracker only).
 *
 * Renders ONE LoanDetailVM (via the dataSource seam): real API data in live mode, the mock
 * adapter's data in mock mode. The screen never reads placeholder data directly, so no mock
 * content can appear in live mode. Layout: hero, overdue banner, Next collection + Last payment
 * tiles, settlement agreement (only when one exists), Dues & charges breakdown, disclaimer.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate as formatIsoDate, formatINR as formatPaise } from '@app/shared';

import { Card, Icon, IconTile, ProgressBar, StateScroll, StateView, StatusBadge, type IconName } from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { useLoanData } from '@/features/api/dataSource';
import type { LoanDetailVM } from '@/features/api/vm';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import { OverviewSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState } from '@/features/system/components/SystemStates';
import { useAppTheme } from '@/hooks/use-theme';

export default function LoanOverviewScreen() {
  useSecureScreen();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const query = useLoanData(loanId ?? '');

  if (query.status === 'session_expired') return <Redirect href="/session-expired" />;
  if (query.status === 'loading') return <OverviewSkeleton />;
  if (query.status === 'error') {
    return (
      <StateScroll>
        <LoadErrorState onRetry={query.refetch} />
      </StateScroll>
    );
  }
  if (!query.data) {
    return (
      <StateScroll>
        <StateView
          icon="document-text-outline"
          title="Loan not found"
          message="We could not find this loan. Go back to Home and try again."
        />
      </StateScroll>
    );
  }
  return <OverviewContent vm={query.data} refetch={query.refetch} />;
}

function OverviewContent({
  vm,
  refetch,
}: {
  vm: LoanDetailVM;
  refetch: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const caps = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption - 1,
    fontWeight: theme.typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as const;
  const cardStyle = { borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md } as const;

  // Next collection: weekly loans only in the live API; a dash is shown when there is none.
  const nextDate = vm.nextCollectionDate ? formatIsoDate(vm.nextCollectionDate) : null;

  const badge = vm.status === 'OVERDUE' ? 'OVERDUE' : vm.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE';

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: insets.bottom + theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Hero: account, status, outstanding, EMIs-paid progress */}
      <Card tone="card" style={{ ...cardStyle, borderRadius: theme.radius.xl, gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <IconTile name="wallet-outline" size={44} background="primarySoft" color="onPrimary" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>Account</Text>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.important,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {vm.accountNumber}
            </Text>
          </View>
          <StatusBadge status={badge} />
        </View>

        <View style={{ gap: 2 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
            Current outstanding balance
          </Text>
          <Text
            accessibilityLabel={`Current outstanding balance ${formatPaise(vm.outstandingPaise)}`}
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading + 14,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            {formatPaise(vm.outstandingPaise)}
          </Text>
        </View>

        {/* EMIs-paid progress (needs numberOfInstallments from the API) */}
        {vm.numberOfInstallments && vm.numberOfInstallments > 0 ? (
          <LoanProgress
            totalEmis={vm.numberOfInstallments}
            emisPaid={
              vm.status === 'CLOSED'
                ? vm.numberOfInstallments
                : vm.emiAmountPaise > 0
                  ? Math.min(vm.numberOfInstallments, Math.floor(vm.totalPaidPaise / vm.emiAmountPaise))
                  : 0
            }
          />
        ) : null}
      </Card>

      {/* Overdue warning banner with installment count */}
      {vm.overdueAmountPaise > 0 ? (
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLabel={`${formatPaise(vm.overdueAmountPaise)} overdue`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.xl,
            backgroundColor: theme.colors.dangerSoft,
            borderWidth: 1,
            borderColor: `${theme.colors.danger}40`,
          }}
        >
          <IconTile name="warning-outline" size={44} background="card" color="danger" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.colors.danger, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
              {formatPaise(vm.overdueAmountPaise)} overdue
            </Text>
            <Text style={{ color: theme.colors.danger, fontSize: theme.typography.size.caption }}>
              {vm.installmentsOverdue != null
                ? `${vm.installmentsOverdue} ${vm.installmentsOverdue === 1 ? 'installment' : 'installments'} overdue`
                : 'Overdue balance pending clearance'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Next collection + last payment tiles */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <InfoTile
          icon="calendar-outline"
          iconBackground="primarySoft"
          iconColor="onPrimary"
          label="Next collection"
          value={nextDate ?? '\u2014'}
          sub={nextDate && vm.weeklyOff ? `Closed on ${vm.weeklyOff}` : undefined}
        />
        <InfoTile
          icon="checkmark-circle-outline"
          iconBackground="successSoft"
          iconColor="success"
          label="Last payment"
          value={vm.lastPayment ? formatPaise(vm.lastPayment.amountPaise) : '\u2014'}
          sub={vm.lastPayment?.date ? `on ${formatIsoDate(vm.lastPayment.date)}` : undefined}
          subTone="success"
        />
      </View>

      {/* Settlement agreement card (wire-backed) */}
      {vm.settlement ? (
        <Card tone="card" style={{ ...cardStyle, borderColor: theme.colors.warning, borderWidth: 1.5 }}>
          <SectionHeading icon="hand-left-outline" title="Settlement agreement" />
          <View style={{ gap: 2 }}>
            <Text style={caps}>Agreed settlement amount</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold }}>
              {formatPaise(vm.settlement.settlementAmountPaise)}
            </Text>
          </View>
          <View>
            {vm.settlement.settlementDate ? (
              <AmountRow label="Agreement date" value={formatIsoDate(vm.settlement.settlementDate)} />
            ) : null}
            <AmountRow label="Paid since settlement" value={formatPaise(vm.settlement.paidSinceSettlementPaise)} tone="success" />
            <AmountRow label="Remaining settlement balance" value={formatPaise(vm.settlement.balancePaise)} bold tone="danger" />
            {vm.settlement.installmentAmountPaise ? (
              <AmountRow
                label="Installment terms"
                value={`${formatPaise(vm.settlement.installmentAmountPaise)} ${vm.settlement.paymentFrequency ? `/ ${vm.settlement.paymentFrequency}` : ''}`}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* Dues & charges breakdown card (wire-backed) */}
      {vm.dues ? (
        <Card tone="card" style={{ ...cardStyle, borderRadius: theme.radius.xl, gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <IconTile name="calculator-outline" size={44} background="primarySoft" color="onPrimary" />
            <Text
              accessibilityRole="header"
              style={{
                flex: 1,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.important + 1,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              Dues & charges breakdown
            </Text>
          </View>
          <View>
            <DuesRow label="Installments due so far" value={formatPaise(vm.dues.installmentsDuePaise)} />
            {vm.dues.lateFeesPaise > 0 ? (
              <DuesRow label="Late fees accrued" prefix="+" value={formatPaise(vm.dues.lateFeesPaise)} tone="danger" />
            ) : null}
            {vm.dues.overdueInterestPaise > 0 ? (
              <DuesRow label="Overdue interest" prefix="+" value={formatPaise(vm.dues.overdueInterestPaise)} tone="danger" />
            ) : null}
            {vm.dues.recoveryVisitChargesPaise > 0 ? (
              <DuesRow label="Recovery visit charges" prefix="+" value={formatPaise(vm.dues.recoveryVisitChargesPaise)} tone="danger" />
            ) : null}
            {vm.dues.discountPaise > 0 ? (
              <DuesRow label="Concession / discount" prefix={'\u2212'} value={formatPaise(vm.dues.discountPaise)} tone="success" />
            ) : null}
          </View>
          <View
            style={{
              gap: theme.spacing.sm,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.mutedSurface,
            }}
          >
            <TotalRow label="Total due so far" value={formatPaise(vm.dues.totalDuePaise)} />
            <TotalRow label="Total paid so far" prefix={'\u2212'} value={formatPaise(vm.dues.totalPaidPaise)} tone="success" />
          </View>
        </Card>
      ) : null}

      {/* Footer disclaimer (always visible) */}
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md }}>
        <IconTile name="shield-checkmark-outline" size={32} background="surface" color="textSecondary" />
        <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
          This app shows your loan information only. Payments are not made in this app. For queries
          or repayments, please contact your lending branch directly.
        </Text>
      </View>
    </ScrollView>
  );
}

function LoanProgress({ totalEmis, emisPaid }: { totalEmis: number; emisPaid: number }) {
  const theme = useAppTheme();
  const safeTotal = Math.max(1, totalEmis);
  const clampedPaid = Math.min(safeTotal, Math.max(0, emisPaid));
  const remaining = safeTotal - clampedPaid;
  const percent = Math.round((clampedPaid / safeTotal) * 100);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.bold }}>
          {clampedPaid} of {safeTotal} EMIs paid
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          {percent}% done {'\u00B7'} {remaining} left
        </Text>
      </View>
      <ProgressBar ratio={clampedPaid / safeTotal} height={10} accessibilityLabel={`${clampedPaid} of ${safeTotal} EMIs paid`} />
    </View>
  );
}

/** Small card with an icon, a label, a big value and an optional sub-line (Next collection / Last payment). */
function InfoTile({
  icon,
  iconBackground,
  iconColor,
  label,
  value,
  sub,
  subTone,
}: {
  icon: IconName;
  iconBackground: AppColorRole;
  iconColor: AppColorRole;
  label: string;
  value: string;
  sub?: string;
  subTone?: 'success';
}) {
  const theme = useAppTheme();
  return (
    <Card
      tone="card"
      style={{ flex: 1, borderRadius: theme.radius.xl, padding: theme.spacing.lg, gap: theme.spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <IconTile name={icon} size={36} background={iconBackground} color={iconColor} />
        <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          {label}
        </Text>
      </View>
      <View style={{ gap: 2 }}>
        <Text
          accessibilityLabel={`${label} ${value}${sub ? `, ${sub}` : ''}`}
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}
        >
          {value}
        </Text>
        {sub ? (
          <Text
            style={{
              color: subTone === 'success' ? theme.colors.success : theme.colors.textSecondary,
              fontSize: theme.typography.size.caption - 1,
              fontWeight: theme.typography.weight.semibold,
            }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Breakdown row with a hairline under it (Dues & charges card). */
function DuesRow({ label, value, prefix, tone }: { label: string; value: string; prefix?: string; tone?: 'danger' | 'success' }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: 48,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.size.body }}>{label}</Text>
      <Text
        style={{
          color: tone ? theme.colors[tone] : theme.colors.textPrimary,
          fontSize: theme.typography.size.body,
          fontWeight: theme.typography.weight.bold,
        }}
      >
        {prefix ? `${prefix} ` : ''}
        {value}
      </Text>
    </View>
  );
}

function TotalRow({ label, value, prefix, tone }: { label: string; value: string; prefix?: string; tone?: 'success' }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.bold }}>
        {label}
      </Text>
      <Text
        style={{
          color: tone ? theme.colors[tone] : theme.colors.textPrimary,
          fontSize: theme.typography.size.important,
          fontWeight: theme.typography.weight.bold,
        }}
      >
        {prefix ? `${prefix} ` : ''}
        {value}
      </Text>
    </View>
  );
}

function SectionHeading({ icon, title }: { icon: IconName; title: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Icon name={icon} size={20} color="secondary" />
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.body + 1,
          fontWeight: theme.typography.weight.bold,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function AmountRow({
  label,
  value,
  prefix,
  bold,
  tone,
}: {
  label: string;
  value: string;
  prefix?: string;
  bold?: boolean;
  tone?: 'danger' | 'success';
}) {
  const theme = useAppTheme();
  const color = tone ? theme.colors[tone] : theme.colors.textPrimary;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 38,
        paddingVertical: 2,
        paddingHorizontal: theme.spacing.xs,
        gap: theme.spacing.md,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: bold ? theme.colors.textPrimary : theme.colors.textSecondary,
          fontSize: theme.typography.size.caption + 1,
          fontWeight: bold ? theme.typography.weight.semibold : theme.typography.weight.regular,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color,
          fontSize: bold ? theme.typography.size.body : theme.typography.size.caption + 1,
          fontWeight: bold ? theme.typography.weight.bold : theme.typography.weight.semibold,
        }}
      >
        {prefix ? `${prefix} ` : ''}
        {value}
      </Text>
    </View>
  );
}
