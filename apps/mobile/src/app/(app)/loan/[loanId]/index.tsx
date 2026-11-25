/**
 * S6: Loan Overview. Answers: how much do I owe, why, what have I paid.
 * The Pay now button is a placeholder until the payment feature is built (see features.ts).
 *
 * Renders ONE LoanDetailVM (via the dataSource seam): real API data in live mode, the mock
 * adapter's data in mock mode. The screen never reads placeholder data directly, so no mock
 * content can appear in live mode. Layout: hero, Next collection + Last payment
 * tiles (Pay now button: no action yet), settlement agreement (only when one exists), Loan summary
 * (interest, total due, total paid, Tut, ledger rows, outstanding balance).
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatDate as formatIsoDate,
  formatINR as formatPaise,
  installmentsBehind,
  interestChargedPaise,
  totalPayablePaise,
  tutPaise,
  wholeInstallmentsIn,
} from '@app/shared';

import { Button, Card, Icon, IconTile, ProgressBar, StateScroll, StateView, StatusBadge, type IconName } from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { useLoanData } from '@/features/api/dataSource';
import { showPayNow } from '@/features/api/features';
import type { LoanDetailVM } from '@/features/api/vm';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import { OverviewSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState } from '@/features/system/components/SystemStates';
import { useAppTheme } from '@/hooks/use-theme';
import { logger } from '@/lib/logger';

export default function LoanOverviewScreen() {
  useSecureScreen();
  const { t } = useTranslation();
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
          title={t('overview.notFoundTitle')}
          message={t('overview.notFoundMsg')}
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
  const { t } = useTranslation();
  const lang = theme.language;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [payHint, setPayHint] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const caps = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption - 1,
    fontWeight: theme.typography.weight.semibold,
    letterSpacing: theme.tracking(0.6),
    textTransform: 'uppercase',
  } as const;
  const cardStyle = { borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md } as const;

  // Next collection: weekly loans only in the live API; a dash is shown when there is none.
  const nextDate = vm.nextCollectionDate ? formatIsoDate(vm.nextCollectionDate, lang) : null;

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
      {/* Hero: ONE dominant figure. Identity on top, balance in the middle, progress at the bottom;
          nothing else competes with the amount (details live in the Loan summary below). */}
      <Card tone="card" style={{ ...cardStyle, borderRadius: theme.radius.xl, gap: theme.golden.spacing.f3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              flex: 1,
              color: theme.colors.textPrimary,
              fontSize: theme.golden.type.lead,
              lineHeight: theme.golden.lineHeight.lead,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            {vm.accountNumber}
          </Text>
          <StatusBadge status={badge} />
        </View>

        <View style={{ gap: theme.golden.spacing.f1 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.golden.type.body, lineHeight: theme.golden.lineHeight.body }}>
            {t('overview.outstanding')}
          </Text>
          <Text
            accessibilityLabel={`${t('overview.outstanding')} ${formatPaise(vm.outstandingPaise)}`}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.golden.type.display,
              lineHeight: theme.golden.lineHeight.display,
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
      {/* Next collection + last payment tiles */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <InfoTile
          icon="calendar-outline"
          iconBackground="primarySoft"
          iconColor="onPrimary"
          label={t('overview.nextCollection')}
          value={nextDate ?? '\u2014'}
          sub={nextDate && vm.weeklyOff ? t('overview.closedOn', { day: t(`weekday.${vm.weeklyOff}`, { defaultValue: vm.weeklyOff }) }) : undefined}
          action={
            showPayNow() ? (
              <View style={{ gap: theme.spacing.xs }}>
                <Button
                  label={t('overview.payNow')}
                  onPress={() => {
                    // No payment flow yet (link to be added later); never log amounts or loan ids.
                    logger.info('overview', 'pay_now_tapped');
                    setPayHint(true);
                  }}
                />
                {payHint ? (
                  <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: theme.golden.type.small }}>
                    {t('overview.payNotReady')}
                  </Text>
                ) : null}
              </View>
            ) : undefined
          }
        />
        <InfoTile
          icon="checkmark-circle-outline"
          iconBackground="successSoft"
          iconColor="success"
          label={t('overview.lastPayment')}
          value={vm.lastPayment ? formatPaise(vm.lastPayment.amountPaise) : '\u2014'}
          sub={vm.lastPayment?.date ? t('overview.onDate', { date: formatIsoDate(vm.lastPayment.date, lang) }) : undefined}
          subTone="success"
        />
      </View>

      {/* Settlement agreement card (wire-backed) */}
      {vm.settlement ? (
        <Card tone="card" style={{ ...cardStyle, borderColor: theme.colors.warning, borderWidth: 1.5 }}>
          <SectionHeading icon="hand-left-outline" title={t('overview.settlementTitle')} />
          <View style={{ gap: 2 }}>
            <Text style={caps}>{t('overview.settleAmount')}</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold }}>
              {formatPaise(vm.settlement.settlementAmountPaise)}
            </Text>
          </View>
          <View>
            {vm.settlement.settlementDate ? (
              <AmountRow label={t('overview.settleDate')} value={formatIsoDate(vm.settlement.settlementDate, lang)} />
            ) : null}
            <AmountRow label={t('overview.paidSince')} value={formatPaise(vm.settlement.paidSinceSettlementPaise)} tone="success" />
            <AmountRow label={t('overview.settleBalance')} value={formatPaise(vm.settlement.balancePaise)} bold tone="danger" />
            {vm.settlement.installmentAmountPaise ? (
              <AmountRow
                label={t('overview.settleTerms')}
                value={`${formatPaise(vm.settlement.installmentAmountPaise)} ${vm.settlement.paymentFrequency ? `/ ${t(`frequency.${vm.settlement.paymentFrequency}`, { defaultValue: vm.settlement.paymentFrequency })}` : ''}`}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* Loan summary: interest, total due / paid, Tut, ledger rows, outstanding balance */}
      {vm.dues ? <LoanSummaryCard vm={vm} dues={vm.dues} /> : null}
    </ScrollView>
  );
}

function LoanProgress({ totalEmis, emisPaid }: { totalEmis: number; emisPaid: number }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const safeTotal = Math.max(1, totalEmis);
  const clampedPaid = Math.min(safeTotal, Math.max(0, emisPaid));
  const remaining = safeTotal - clampedPaid;
  return (
    <View style={{ gap: theme.golden.spacing.f1 }}>
      <ProgressBar ratio={clampedPaid / safeTotal} height={8} accessibilityLabel={t('overview.emisPaid', { paid: clampedPaid, total: safeTotal })} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.golden.type.caption }}>
          {t('overview.emisPaid', { paid: clampedPaid, total: safeTotal })}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.golden.type.caption }}>{t('overview.left', { n: remaining })}</Text>
      </View>
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
  action,
}: {
  icon: IconName;
  iconBackground: AppColorRole;
  iconColor: AppColorRole;
  label: string;
  value: string;
  sub?: string;
  subTone?: 'success';
  /** Optional element under the value (e.g. the Pay now button). */
  action?: ReactNode;
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
      {action}
    </Card>
  );
}

/** One ledger line: label (+ optional note), amount. Hairline underneath. */
function LedgerRow({
  label,
  note,
  noteTone = 'danger',
  prefix,
  value,
  valueTone,
  bold,
  last,
}: {
  label: string;
  note?: string;
  noteTone?: 'danger' | 'textSecondary';
  prefix?: '+' | '\u2212';
  value: string;
  valueTone?: 'success' | 'danger';
  bold?: boolean;
  last?: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const g = theme.golden;
  const size = g.type.body;
  return (
    <View
      accessible
      accessibilityLabel={`${prefix === '+' ? `${t('summary.plus')} ` : prefix ? `${t('summary.minus')} ` : ''}${label}${note ? ` ${note}` : ''}, ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        minHeight: theme.touchTarget.min,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: size, lineHeight: g.lineHeight.body, fontWeight: bold ? theme.typography.weight.bold : theme.typography.weight.regular }}>
        {prefix ? (
          <Text style={{ color: prefix === '+' ? theme.colors.danger : theme.colors.success, fontWeight: theme.typography.weight.bold }}>
            {`(${prefix}) `}
          </Text>
        ) : null}
        {label}
        {note ? <Text style={{ color: theme.colors[noteTone], fontWeight: theme.typography.weight.bold }}>{`  ${note}`}</Text> : null}
      </Text>
      <Text
        style={{
          color: valueTone ? theme.colors[valueTone] : theme.colors.textPrimary,
          fontSize: size,
          lineHeight: g.lineHeight.body,
          fontWeight: theme.typography.weight.bold,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Loan summary card. Everything comes from the API (`dues`, `outstandingAmount`, ...) except two
 * derived figures: Interest charged and Payable Amount (EMI x tenure), which are hidden when the
 * tenure is not available. Outstanding balance is the API value, never recalculated here.
 */
function LoanSummaryCard({ vm, dues }: { vm: LoanDetailVM; dues: NonNullable<LoanDetailVM['dues']> }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const g = theme.golden;
  const payable = totalPayablePaise(vm.emiAmountPaise, vm.numberOfInstallments);
  const interest = interestChargedPaise(vm.emiAmountPaise, vm.numberOfInstallments, vm.principalPaise);
  const dueCount = wholeInstallmentsIn(dues.installmentsDuePaise, vm.emiAmountPaise);
  const dueNote = dueCount != null && dueCount > 0 && vm.emiAmountPaise > 0 ? `(${formatPaise(vm.emiAmountPaise)} x ${dueCount})` : undefined;
  // Total Due = instalments due so far ONLY (no fees / interest / discount; those are in the ledger
  // below and inside the outstanding balance). Tut is worked out here from the same two numbers so
  // the three rows always add up: Total Due - Total Paid = Tut.
  const tut = tutPaise(dues.installmentsDuePaise, dues.totalPaidPaise);
  const overdueCount = installmentsBehind(tut, vm.emiAmountPaise) ?? vm.installmentsOverdue ?? 0;

  return (
    <Card tone="card" style={{ borderRadius: theme.radius.xl, padding: theme.spacing.lg, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <IconTile name="calculator-outline" size={44} background="primarySoft" color="onPrimary" />
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={{ color: theme.colors.textPrimary, fontSize: g.type.lead, lineHeight: g.lineHeight.lead, fontWeight: theme.typography.weight.bold }}
          >
            {t('summary.title')}
          </Text>
          {interest != null ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: g.type.body, lineHeight: g.lineHeight.body }}>
              {t('summary.interest')}{' '}
              <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.bold }}>{formatPaise(interest)}</Text>
            </Text>
          ) : null}
        </View>
      </View>

      {/* Due / paid / Tut */}
      <View style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.mutedSurface, paddingHorizontal: theme.spacing.md, overflow: 'hidden' }}>
        <LedgerRow label={t('summary.totalDue')} note={dueNote} value={formatPaise(dues.installmentsDuePaise)} />
        <LedgerRow label={t('summary.totalPaid')} value={formatPaise(dues.totalPaidPaise)} />
        {/* Tut = total due - total paid (the overdue amount); badge = instalments behind */}
        <View
          accessible
          accessibilityLabel={overdueCount > 0 ? t('summary.tutA11y', { n: overdueCount, amount: formatPaise(tut) }) : t('summary.tutA11yNone', { amount: formatPaise(tut) })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
            minHeight: theme.touchTarget.min,
            marginHorizontal: -theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.primary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.onPrimary, fontSize: g.type.body, fontWeight: theme.typography.weight.bold }}>{t('summary.tut')}</Text>
            {overdueCount > 0 ? (
              <View style={{ minWidth: 22, paddingHorizontal: 6, paddingVertical: 1, borderRadius: theme.radius.sm, backgroundColor: theme.colors.danger, alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: g.type.small, fontWeight: theme.typography.weight.bold }}>{overdueCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: theme.colors.onPrimary, fontSize: g.type.body, fontWeight: theme.typography.weight.bold }}>
            {formatPaise(tut)}
          </Text>
        </View>
      </View>

      {/* Ledger */}
      <View>
        {payable != null ? (
          <LedgerRow label={t('summary.payable')} note={`(${formatPaise(vm.principalPaise)})`} noteTone="textSecondary" value={formatPaise(payable)} valueTone="success" />
        ) : null}
        <LedgerRow prefix="+" label={t('summary.lateFee')} value={formatPaise(dues.lateFeesPaise)} />
        <LedgerRow prefix="+" label={t('summary.overdueInterest')} value={formatPaise(dues.overdueInterestPaise)} />
        <LedgerRow prefix="+" label={t('summary.recoveryVisit')} value={formatPaise(dues.recoveryVisitChargesPaise)} />
        <LedgerRow prefix={'\u2212'} label={t('summary.discount')} value={formatPaise(dues.discountPaise)} />
        <LedgerRow prefix={'\u2212'} label={t('summary.adjusted')} value={formatPaise(dues.adjustmentsPaise)} />
        <LedgerRow prefix={'\u2212'} label={t('summary.advance')} value={formatPaise(dues.advanceInstallmentPaise)} />
        <LedgerRow prefix={'\u2212'} label={t('summary.installmentPaid')} value={formatPaise(dues.installmentPaymentsPaise)} valueTone="success" />
        <LedgerRow label={t('summary.totalOutstanding')} value={formatPaise(vm.outstandingPaise)} bold last />
      </View>
    </Card>
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
