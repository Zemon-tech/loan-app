/**
 * S6: Loan Overview — PRD 8.6. Answers: how much do I owe, why, what is due, what have I paid.
 * NO payment button, link, UPI or QR anywhere (tracker only).
 *
 * TODO (M-06):
 *  - GET /v1/loans/{loanId}; loading/error states; pull-to-refresh; "Figures as of {asOf}"
 *  - keyFacts.kfsDocumentUrl from the API; format money via @app/shared formatINR; i18n
 */
import * as WebBrowser from 'expo-web-browser';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Icon, IconTile, ProgressBar, StateScroll, StateView, StatusBadge, type IconName } from '@/components/ui';
import { Links } from '@/constants/links';
import { dueLabel, formatDate, formatINR } from '@/features/loans/format';
import { findPlaceholderLoan, type Loan } from '@/features/loans/placeholderData';
import { OverviewSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState } from '@/features/system/components/SystemStates';
import { useMockQuery } from '@/features/system/mockQuery';
import { useAppTheme } from '@/hooks/use-theme';

export default function LoanOverviewScreen() {
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const load = useCallback(() => findPlaceholderLoan(loanId ?? ''), [loanId]);
  const query = useMockQuery(`loan:${loanId}`, load);

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
  return <OverviewContent loan={query.data} />;
}

function OverviewContent({ loan }: { loan: Loan }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [detailsOpen, setDetailsOpen] = useState(true);

  const caps = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption - 1,
    fontWeight: theme.typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as const;
  const cardStyle = { borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md } as const;
  const remaining = loan.totalEmis - loan.emisPaid;
  const percent = Math.round((loan.emisPaid / loan.totalEmis) * 100);
  const frequencyUnit = loan.frequency === 'Daily' ? 'day' : 'month';
  const badge = loan.status === 'OVERDUE' ? 'OVERDUE' : loan.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE';

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: insets.bottom + theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
    >
      {/* Hero: account, outstanding, progress */}
      <Card tone="card" style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <IconTile name="briefcase-outline" size={40} background="primarySoft" />
          <View style={{ flex: 1 }}>
            <Text style={caps}>Account {loan.accountNumber}</Text>
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}
            >
              {loan.productName}
            </Text>
          </View>
          <StatusBadge status={badge} />
        </View>

        <View style={{ gap: 2 }}>
          <Text style={caps}>Current outstanding balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
            <Text
              accessibilityLabel={`Current outstanding balance ${formatINR(loan.outstanding)}`}
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.heading + 6,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {formatINR(loan.outstanding)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>INR</Text>
          </View>
        </View>

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
      </Card>

      {/* Overdue warning (informational only) */}
      {loan.overdueAmount > 0 ? (
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLabel={`${formatINR(loan.overdueAmount)} overdue across ${loan.overdueInstallments} delayed installments`}
          style={{
            flexDirection: 'row',
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
              {formatINR(loan.overdueAmount)} overdue
            </Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, lineHeight: 18 }}>
              Across {loan.overdueInstallments} delayed installments.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="information-circle-outline" size={14} color="textSecondary" />
              <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
                Informational record only. Non-transactional overview.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Next installment due */}
      {loan.nextDue ? (
        <Card tone="card" style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <IconTile name="calendar-outline" size={40} background="primarySoft" />
          <View style={{ flex: 1 }}>
            <Text style={caps}>Next installment due</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
                {formatINR(loan.nextDue.amount)}
              </Text>
              <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold }}>
                {dueLabel(loan.nextDue.date)} ({formatDate(loan.nextDue.date)})
              </Text>
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              EMI #{loan.nextDue.emiNumber}
            </Text>
          </View>
        </Card>
      ) : loan.status === 'CLOSED' ? (
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
      ) : null}

      {/* Loan details (collapsible) */}
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
            {[
              ['Loan account number', loan.accountNumber],
              ['Scheme', loan.scheme],
              ['Loan sanction date', formatDate(loan.loanDate)],
              ['First EMI date', formatDate(loan.firstEmiDate)],
              ['EMI amount', `${formatINR(loan.emiAmount)} / ${frequencyUnit}`],
              ['Frequency', loan.frequency],
              ['Total EMIs', `${loan.totalEmis} installments`],
              ['Maturity date', formatDate(loan.maturityDate)],
              ['Originating branch', loan.branch],
              [
                'Last recorded payment',
                loan.lastPayment ? `${formatDate(loan.lastPayment.date)} (${formatINR(loan.lastPayment.amount)})` : '\u2014',
              ],
            ].map(([label, value], i) => (
              <DetailRow key={label} label={label!} value={value!} shaded={i % 2 === 1} highlight={label === 'Last recorded payment' && !!loan.lastPayment} />
            ))}
          </View>
        ) : null}
      </Card>

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
