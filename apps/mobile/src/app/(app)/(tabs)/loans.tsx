/**
 * S5: Home (tab) — answers in seconds: how much do I owe, am I overdue, what is due next,
 * which loans do I have, how far along am I. Purely informational: no payment action.
 * Sticky header pinned at the top while content scrolls smoothly beneath.
 */
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { BrandMark, Card, Icon, IconTile, PressableScale, ScreenContainer } from '@/components/ui';
import { HomeSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState, NoLoansState, OfflineBanner } from '@/features/system/components/SystemStates';
import { useMockQuery } from '@/features/system/mockQuery';
import { dueLabel, formatINR } from '@/features/loans/format';
import { LoanCard } from '@/features/loans/components/LoanCard';
import {
  PLACEHOLDER_CUSTOMER,
  PLACEHOLDER_LOANS,
  summarize,
  type Loan,
} from '@/features/loans/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function openLoan(loanId: string) {
  router.push({ pathname: '/loan/[loanId]', params: { loanId } });
}

/** Stable loader for the (prototype) loans request. */
const loadLoans = () => PLACEHOLDER_LOANS;

/** Chooses between loading, error, session-expired, empty and the real Home. */
export default function HomeScreen() {
  const query = useMockQuery('loans', loadLoans);

  if (query.status === 'session_expired') return <Redirect href="/session-expired" />;

  if (query.status === 'loading') {
    return (
      <ScreenContainer tone="canvas" scroll={false} bottomInset={false}>
        <HomeSkeleton />
      </ScreenContainer>
    );
  }

  if (query.status === 'error') {
    return (
      <ScreenContainer tone="canvas" bottomInset={false}>
        <AppBar />
        <LoadErrorState onRetry={query.refetch} />
      </ScreenContainer>
    );
  }

  if (query.data.length === 0) {
    return (
      <ScreenContainer tone="canvas" bottomInset={false}>
        <AppBar />
        <NoLoansState onRefresh={query.refetch} />
      </ScreenContainer>
    );
  }

  return <HomeContent loans={query.data} />;
}

function AppBar() {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <BrandMark size={36} />
      <Text
        accessibilityRole="header"
        style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title, fontWeight: theme.typography.weight.bold }}
      >
        Loan Tracker
      </Text>
    </View>
  );
}

function HomeContent({ loans }: { loans: Loan[] }) {
  const theme = useAppTheme();
  const summary = summarize(loans);
  const { activeLoans, closedLoans } = summary;
  const allClosed = activeLoans.length === 0;
  // Closed loans stay collapsed, unless there is nothing else to show.
  const [closedOpen, setClosedOpen] = useState(allClosed);

  const label = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontWeight: theme.typography.weight.medium,
  } as const;

  const homeHeader = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 }}>
        <BrandMark size={36} />
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.title,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            {greeting()}, {PLACEHOLDER_CUSTOMER.firstName}
          </Text>
          <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
            Here&apos;s your loan summary
          </Text>
        </View>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={() => router.navigate('/account')}
        haptic
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: theme.colors.primarySoft,
          borderWidth: 1.5,
          borderColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: theme.typography.size.body,
            fontWeight: theme.typography.weight.bold,
            textAlign: 'center',
            textAlignVertical: 'center',
            includeFontPadding: false,
            lineHeight: 20,
          }}
        >
          {PLACEHOLDER_CUSTOMER.initials}
        </Text>
      </PressableScale>
    </View>
  );

  return (
    <ScreenContainer tone="canvas" bottomInset={false} header={homeHeader}>
      <OfflineBanner />

      {/* Summary */}
      <Animated.View entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}>
        <Card
          tone="card"
          style={{ borderRadius: theme.radius.xl, padding: theme.spacing.lg, gap: theme.spacing.md }}
        >
          <Text style={label}>{allClosed ? 'Total outstanding' : 'Total outstanding (all active loans)'}</Text>
          <Text
            accessibilityLabel={`Total outstanding ${formatINR(summary.totalOutstanding)}`}
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading + 8,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            {formatINR(summary.totalOutstanding)}
          </Text>

          {allClosed ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="checkmark-circle" size={20} color="success" />
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body, flex: 1 }}>
                You have no active loans. All your loans are fully paid.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <SummaryStat
                label="Active loans"
                value={String(activeLoans.length)}
                sub={activeLoans.length === 1 ? 'loan' : 'loans'}
              />
              <SummaryStat
                label="Overdue"
                value={formatINR(summary.overdueTotal)}
                sub={
                  summary.overdueTotal > 0
                    ? `on ${summary.overdueLoanCount} ${summary.overdueLoanCount === 1 ? 'loan' : 'loans'}`
                    : 'none'
                }
                tone={summary.overdueTotal > 0 ? 'danger' : 'neutral'}
                icon={summary.overdueTotal > 0 ? 'warning' : undefined}
              />
              <SummaryStat
                label="Next due"
                value={summary.nextDue ? formatINR(summary.nextDue.amount) : '\u2014'}
                sub={summary.nextDue ? dueLabel(summary.nextDue.date).replace('Due ', '') : ''}
                tone="primary"
              />
            </View>
          )}

          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            Last updated 10 mins ago
          </Text>
        </Card>
      </Animated.View>

      {/* Active loans */}
      {activeLoans.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.subtitle,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            Your loans
          </Text>
          {activeLoans.map((loan, index) => (
            <Animated.View
              key={loan.loanId}
              entering={FadeInDown.duration(280)
                .delay(index * 60)
                .reduceMotion(ReduceMotion.System)}
            >
              <LoanCard loan={loan} onPress={() => openLoan(loan.loanId)} />
            </Animated.View>
          ))}
        </View>
      ) : null}

      {/* Closed loans — quieter than active ones with smooth layout animation */}
      {closedLoans.length > 0 ? (
        <Animated.View
          layout={LinearTransition.duration(220).easing(Easing.out(Easing.cubic))}
          style={{
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            overflow: 'hidden',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: closedOpen }}
            accessibilityLabel={`Closed loans, ${closedLoans.length} ${closedLoans.length === 1 ? 'loan' : 'loans'}`}
            onPress={() => setClosedOpen((v) => !v)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: theme.touchTarget.min + 8,
              paddingHorizontal: theme.spacing.lg,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
                Closed loans
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                {closedLoans.length} {closedLoans.length === 1 ? 'loan' : 'loans'}
              </Text>
            </View>
            <Icon name={closedOpen ? 'chevron-up' : 'chevron-down'} size={22} color="textSecondary" />
          </Pressable>

          {closedOpen
            ? closedLoans.map((loan) => (
                <Animated.View
                  key={loan.loanId}
                  entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}
                  exiting={FadeOutUp.duration(120).reduceMotion(ReduceMotion.System)}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Closed loan ${loan.accountNumber}, ${loan.productName}. Fully paid.`}
                    onPress={() => openLoan(loan.loanId)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      minHeight: theme.touchTarget.min + 8,
                      paddingHorizontal: theme.spacing.lg,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <IconTile name="checkmark-circle-outline" size={36} background="successSoft" color="success" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.medium }}>
                        {loan.accountNumber} {'\u2022'} {loan.productName}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                        Fully paid {'\u2022'} {loan.emisPaid} of {loan.totalEmis} EMIs
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color="textSecondary" />
                  </Pressable>
                </Animated.View>
              ))
            : null}
        </Animated.View>
      ) : null}
    </ScreenContainer>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'danger' | 'primary';
  icon?: 'warning';
}) {
  const theme = useAppTheme();
  const valueColor =
    tone === 'danger' ? theme.colors.danger : tone === 'primary' ? theme.colors.primary : theme.colors.textPrimary;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}
      style={{
        flex: 1,
        gap: 2,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: tone === 'danger' ? theme.colors.dangerSoft : theme.colors.primarySoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon ? <Icon name={icon} size={12} color="danger" /> : null}
        <Text
          style={{
            color: tone === 'danger' ? theme.colors.danger : theme.colors.textSecondary,
            fontSize: theme.typography.size.caption,
            fontWeight: theme.typography.weight.medium,
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ color: valueColor, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>{sub}</Text>
      ) : null}
    </View>
  );
}
