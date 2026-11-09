/**
 * S6: Loan Overview — PRD 8.6. Answers: how much do I owe, why, what have I paid.
 * NO payment button, link, UPI or QR anywhere (tracker only).
 *
 * Renders a LoanDetailVM (via the dataSource seam) in both modes. In LIVE mode only wire-backed
 * content shows: the hero (account, status, outstanding, overdue) and the "Loan details" card
 * (EMI amount, start/maturity/frequency/financed/total-paid). The unbacked cards (EMIs-paid
 * progress bar, next-due card, financial-ledger card, settlement/payment-breakup card, key-facts
 * card, and scheme/branch/firstEmiDate/lastPayment rows) are hidden — their code is retained and
 * renders in MOCK mode behind showUnbackedCards(), reading the placeholder Loan directly.
 */
import * as WebBrowser from 'expo-web-browser';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate as formatIsoDate, formatINR as formatPaise, type PayFrequency } from '@app/shared';

import { Card, Icon, IconTile, ProgressBar, StateScroll, StateView, StatusBadge, type IconName } from '@/components/ui';
import { showUnbackedCards } from '@/features/api/features';
import { useLoanData } from '@/features/api/dataSource';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import { Links } from '@/constants/links';
import { formatDate, formatINR } from '@/features/loans/format';
import { findPlaceholderLoan, type Loan } from '@/features/loans/placeholderData';
import type { LoanDetailVM } from '@/features/api/vm';
import { OverviewSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState } from '@/features/system/components/SystemStates';
import { useAppTheme } from '@/hooks/use-theme';

const SHOW_MOCK_CARDS = showUnbackedCards();

const FREQUENCY_LABEL: Record<PayFrequency, { label: string; unit: string }> = {
  DAILY: { label: 'Daily', unit: 'day' },
  WEEKLY: { label: 'Weekly', unit: 'week' },
  FORTNIGHTLY: { label: 'Fortnightly', unit: 'fortnight' },
  MONTHLY: { label: 'Monthly', unit: 'month' },
};

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
  return <OverviewContent vm={query.data} loanId={loanId ?? ''} />;
}

function OverviewContent({ vm, loanId }: { vm: LoanDetailVM; loanId: string }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [detailsOpen, setDetailsOpen] = useState(true);

  // Mock-only rich cards still read the placeholder Loan directly (retained for review).
  const mockLoan = SHOW_MOCK_CARDS ? findPlaceholderLoan(loanId) : undefined;

  const caps = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption - 1,
    fontWeight: theme.typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as const;
  const cardStyle = { borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md } as const;

  const badge = vm.status === 'OVERDUE' ? 'OVERDUE' : vm.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE';
  const freq = vm.payFrequency ? FREQUENCY_LABEL[vm.payFrequency] : null;
  const emiRow = freq ? `${formatPaise(vm.emiAmountPaise)} / ${freq.unit}` : formatPaise(vm.emiAmountPaise);

  const detailRows: [string, string][] = [
    ['Loan account number', vm.accountNumber],
    ['EMI amount', emiRow],
    ['Frequency', freq ? freq.label : '\u2014'],
    ['Loan start date', vm.loanDate ? formatIsoDate(vm.loanDate) : '\u2014'],
    ['Maturity date', vm.maturityDate ? formatIsoDate(vm.maturityDate) : '\u2014'],
    ['Financed amount', formatPaise(vm.principalPaise)],
    ['Total paid', formatPaise(vm.totalPaidPaise)],
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: insets.bottom + theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
    >
      {/* Hero: account, status, outstanding (restructured — no productName / progress in live) */}
      <Card tone="card" style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <IconTile name="briefcase-outline" size={40} background="primarySoft" />
          <View style={{ flex: 1 }}>
            <Text style={caps}>Account {vm.accountNumber}</Text>
            {SHOW_MOCK_CARDS && mockLoan ? (
              <Text
                numberOfLines={1}
                style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}
              >
                {mockLoan.productName}
              </Text>
            ) : null}
          </View>
          <StatusBadge status={badge} />
        </View>

        <View style={{ gap: 2 }}>
          <Text style={caps}>Current outstanding balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
            <Text
              accessibilityLabel={`Current outstanding balance ${formatPaise(vm.outstandingPaise)}`}
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.heading + 6,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {formatPaise(vm.outstandingPaise)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>INR</Text>
          </View>
        </View>

        {/* Mock-only: EMIs-paid progress bar (no wire source -> hidden in live mode) */}
        {SHOW_MOCK_CARDS && mockLoan ? <MockProgress loan={mockLoan} /> : null}
      </Card>

      {/* Overdue warning (informational only) */}
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
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.dangerSoft,
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
            <Icon name="warning" size={20} color="danger" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.colors.danger, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
              {formatPaise(vm.overdueAmountPaise)} overdue
            </Text>
          </View>
        </View>
      ) : null}

      {/* Mock-only: next installment due card (no wire source -> hidden in live mode) */}
      {SHOW_MOCK_CARDS && mockLoan ? <MockNextDue loan={mockLoan} /> : null}

      {/* Loan details (collapsible) — wire-backed rows, kept in both modes */}
      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: 0, gap: 0, overflow: 'hidden' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          accessibilityLabel={`Loan details, ${detailsOpen ? 'collapse' : 'expand'}`}
          onPress={() => setDetailsOpen((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: theme.touchTarget.min + 12,
            paddingHorizontal: theme.spacing.lg,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SectionHeading icon="document-text-outline" title="Loan details" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              {detailsOpen ? 'Collapse' : 'Expand'}
            </Text>
            <Icon name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={18} color="textSecondary" />
          </View>
        </Pressable>
        {detailsOpen ? (
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
            {detailRows.map(([label, value], i) => (
              <DetailRow key={label} label={label} value={value} shaded={i % 2 === 1} />
            ))}
            {/* Mock-only rows: scheme / branch / first EMI / last payment */}
            {SHOW_MOCK_CARDS && mockLoan ? (
              <>
                <DetailRow label="Scheme" value={mockLoan.scheme} shaded={detailRows.length % 2 === 1} />
                <DetailRow label="Originating branch" value={mockLoan.branch} shaded={detailRows.length % 2 === 0} />
                <DetailRow label="First EMI date" value={formatDate(mockLoan.firstEmiDate)} shaded={detailRows.length % 2 === 1} />
                <DetailRow
                  label="Last recorded payment"
                  value={mockLoan.lastPayment ? `${formatDate(mockLoan.lastPayment.date)} (${formatINR(mockLoan.lastPayment.amount)})` : '\u2014'}
                  shaded={detailRows.length % 2 === 0}
                  highlight={!!mockLoan.lastPayment}
                />
              </>
            ) : null}
          </View>
        ) : null}
      </Card>

      {/* Mock-only rich cards (no wire source -> hidden in live mode) */}
      {SHOW_MOCK_CARDS && mockLoan ? <MockRichCards loan={mockLoan} /> : null}

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

/* ----------------------- Mock-only sub-views (retained) ----------------------- */

function MockProgress({ loan }: { loan: Loan }) {
  const theme = useAppTheme();
  const remaining = loan.totalEmis - loan.emisPaid;
  const percent = Math.round((loan.emisPaid / loan.totalEmis) * 100);
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name="pie-chart-outline" size={16} color="primary" />
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium }}>
            {loan.emisPaid} of {loan.totalEmis} EMIs paid
          </Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          {percent}% completed {'\u2022'} {remaining} left
        </Text>
      </View>
      <ProgressBar ratio={loan.emisPaid / loan.totalEmis} accessibilityLabel={`${loan.emisPaid} of ${loan.totalEmis} EMIs paid`} />
    </View>
  );
}

function MockNextDue({ loan }: { loan: Loan }) {
  const theme = useAppTheme();
  const cardStyle = { borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md } as const;
  const caps = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption - 1,
    fontWeight: theme.typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as const;
  if (loan.nextDue) {
    return (
      <Card tone="card" style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <IconTile name="calendar-outline" size={40} background="primarySoft" />
        <View style={{ flex: 1 }}>
          <Text style={caps}>Next installment due</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
              {formatINR(loan.nextDue.amount)}
            </Text>
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold }}>
              {formatDate(loan.nextDue.date)}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            EMI #{loan.nextDue.emiNumber}
          </Text>
        </View>
      </Card>
    );
  }
  if (loan.status === 'CLOSED') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.successSoft,
        }}
      >
        <Icon name="checkmark-circle" size={24} color="success" />
        <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.size.body }}>
          This loan is fully paid. Nothing is due.
        </Text>
      </View>
    );
  }
  return null;
}

function MockRichCards({ loan }: { loan: Loan }) {
  const theme = useAppTheme();
  const cardStyle = { borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md } as const;
  const caps = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption - 1,
    fontWeight: theme.typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as const;
  return (
    <>
      {/* Financial ledger breakdown */}
      <Card tone="card" style={cardStyle}>
        <SectionHeading icon="wallet-outline" title="Financial ledger breakdown" />
        <View>
          <AmountRow label="Sanctioned loan amount" value={formatINR(loan.loanAmount)} />
          <AmountRow label="Total contracted interest" value={formatINR(loan.totalInterest)} />
          <Divider />
          <AmountRow label="Total contractual payable" value={formatINR(loan.totalPayable)} bold />
          <AmountRow label="Accrued late fee" prefix="+" value={formatINR(loan.lateFee)} tone={loan.lateFee > 0 ? 'danger' : undefined} />
          <AmountRow label="Overdue interest" prefix="+" value={formatINR(loan.overdueInterest)} tone={loan.overdueInterest > 0 ? 'danger' : undefined} />
          <AmountRow label="Statutory recovery charges" prefix="+" value={formatINR(loan.recoveryCharges)} tone={loan.recoveryCharges > 0 ? 'danger' : undefined} />
          <AmountRow label="Waiver / scheme discount" prefix={'\u2212'} value={formatINR(loan.discount)} tone={loan.discount > 0 ? 'success' : undefined} />
          <Divider />
          <AmountRow label="Total amount due" value={formatINR(loan.totalDue)} bold />
          <AmountRow label="Total paid" prefix={'\u2212'} value={formatINR(loan.totalPaid)} tone="success" />
        </View>

        <View
          style={{
            gap: 2,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.primarySoft,
          }}
        >
          <Text style={[caps, { color: theme.colors.primary }]}>Current outstanding balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold }}>
              {formatINR(loan.outstanding)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>Total due minus paid</Text>
          </View>
        </View>
      </Card>

      {/* Settlement ledger (history only) */}
      <Card tone="card" style={cardStyle}>
        <View style={{ gap: 2 }}>
          <Text style={caps}>Settlement ledger</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
            Paid so far: {formatINR(loan.totalPaid)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <PaidTile icon="card-outline" title="Online / NetBanking" amount={loan.paidOnline.amount} sub={`${loan.paidOnline.count} transactions`} />
          <PaidTile icon="cash-outline" title="Branch cash deposit" amount={loan.paidCash.amount} sub={`${loan.paidCash.count} counter receipts`} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name="checkmark-circle" size={16} color="success" />
          <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            Past payments only, from your lender&apos;s records
          </Text>
        </View>
      </Card>

      {/* Key facts — only when the lender provides them */}
      {loan.keyFacts ? (
        <Card tone="card" style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={caps}>Annual percentage rate</Text>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
                {loan.keyFacts.apr}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                ({loan.keyFacts.method})
              </Text>
            </View>
            <IconTile name="stats-chart-outline" size={40} background="primarySoft" />
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(Links.keyFactStatement)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: theme.touchTarget.min,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.canvas,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="document-outline" size={18} color="primary" />
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium }}>
                View Key Fact Statement (KFS)
              </Text>
            </View>
            <Icon name="arrow-forward" size={18} color="textSecondary" />
          </Pressable>
        </Card>
      ) : null}
    </>
  );
}

function SectionHeading({ icon, title }: { icon: IconName; title: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <IconTile name={icon} size={32} background="surface" color="primary" />
      <Text
        accessibilityRole="header"
        style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}
      >
        {title}
      </Text>
    </View>
  );
}

function DetailRow({ label, value, shaded, highlight }: { label: string; value: string; shaded?: boolean; highlight?: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.lg,
        minHeight: 40,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        backgroundColor: shaded ? theme.colors.canvas : 'transparent',
      }}
    >
      <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>{label}</Text>
      <Text
        style={{
          flex: 1,
          textAlign: 'right',
          color: highlight ? theme.colors.success : theme.colors.textPrimary,
          fontSize: theme.typography.size.caption + 1,
          fontWeight: theme.typography.weight.semibold,
        }}
      >
        {value}
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36, gap: theme.spacing.md }}>
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
          fontSize: theme.typography.size.caption + 1,
          fontWeight: bold ? theme.typography.weight.bold : theme.typography.weight.medium,
        }}
      >
        {prefix ? `${prefix} ` : ''}
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm }} />;
}

function PaidTile({ icon, title, amount, sub }: { icon: IconName; title: string; amount: number; sub: string }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        gap: 4,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.canvas,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Icon name={icon} size={16} color="primary" />
        <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
          {title}
        </Text>
      </View>
      <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
        {formatINR(amount)}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>{sub}</Text>
    </View>
  );
}
