/**
 * S5: Home (tab) — which loans do I have, what do I owe on each, am I overdue. Purely
 * informational: no payment action. Sticky header (one line: greeting + first name) pinned at the
 * top; below it the page title with active / overdue count chips, then the ACTIVE loans as a list table (Loan no. + loan/end dates | Amount | EMI x Tenure + total).
 *
 * Closed loans are never shown (mock or live), there is no chart mode and no profile shortcut.
 * Both modes feed VMs (LoanListItemVM) through the dataSource seam, so mock and live render the
 * same UI. Live list responses carry no dates, loan amount or tenure; LoansTable fills them from the
 * loan detail, otherwise shows a dash. The OfflineBanner is fed by live
 * connectivity in live mode and by the mock env in mock mode (both via useIsOffline).
 */
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Icon, PageTitle, ScreenContainer, type IconName } from '@/components/ui';
import { buildLoansSummary } from '@/features/api/adapter';
import { useLoansData, useProfileData } from '@/features/api/dataSource';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import { HomeSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState, NoLoansState, OfflineBanner } from '@/features/system/components/SystemStates';
import { LoansTable } from '@/features/loans/components/LoansTable';
import type { LoanListItemVM } from '@/features/api/vm';
import { useAppTheme } from '@/hooks/use-theme';

/** i18n key for the time-of-day greeting (device clock: only used to pick morning / afternoon / evening). */
function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'home.morning';
  if (h < 17) return 'home.afternoon';
  return 'home.evening';
}

function openLoan(loanId: string) {
  router.push({ pathname: '/loan/[loanId]', params: { loanId } });
}

/** Chooses between loading, error, session-expired, empty and the real Home. */
export default function HomeScreen() {
  useSecureScreen();
  const query = useLoansData();

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

  return <HomeContent loans={query.data} onRefresh={query.refetch} />;
}

function AppBarTitle() {
  const { t } = useTranslation();
  return <PageTitle title={t('home.yourLoans')} />;
}

/** Header for the error / empty states: same page title as the loaded screen, no logo. */
function AppBar() {
  return <AppBarTitle />;
}

/** Rounded count badge: icon + number + label, never colour alone (PRD 6.4). */
function CountChip({
  icon,
  count,
  label,
  tone,
}: {
  icon: IconName;
  count: number;
  label: string;
  tone: 'success' | 'danger' | 'muted';
}) {
  const theme = useAppTheme();
  const g = theme.golden;
  const bg = tone === 'success' ? theme.colors.successSoft : tone === 'danger' ? theme.colors.dangerSoft : theme.colors.mutedSurface;
  const fg = tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.textSecondary;
  const iconColor = tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'textSecondary';
  return (
    <View
      accessible
      accessibilityLabel={`${count} ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: g.spacing.f1 - 2,
        paddingVertical: g.spacing.f1,
        paddingHorizontal: g.spacing.f2,
        borderRadius: theme.radius.pill,
        backgroundColor: bg,
      }}
    >
      <Icon name={icon} size={g.type.body + 2} color={iconColor} />
      <Text style={{ color: fg, fontSize: g.type.body, lineHeight: g.lineHeight.body, fontWeight: theme.typography.weight.bold }}>
        {count}
        <Text style={{ fontWeight: theme.typography.weight.semibold }}>{` ${label}`}</Text>
      </Text>
    </View>
  );
}

function HomeContent({ loans, onRefresh }: { loans: LoanListItemVM[]; onRefresh: () => void }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const greeting = t(greetingKey());
  const profileQuery = useProfileData();
  const profile = profileQuery.status === 'success' ? profileQuery.data : null;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      profileQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const firstName = profile?.name ? profile.name.split(/\s+/)[0] : t('home.borrower');

  // Only active loans are ever displayed; closed loans are dropped here for mock and live alike.
  const summary = useMemo(() => buildLoansSummary(loans), [loans]);
  const { activeLoans } = summary;

  // Nothing active to show (no loans, or every loan is closed): same empty state as no loans.
  if (activeLoans.length === 0) {
    return (
      <ScreenContainer tone="canvas" bottomInset={false}>
        <AppBar />
        <NoLoansState onRefresh={onRefresh} />
      </ScreenContainer>
    );
  }

  // One line: "Good afternoon, Test". Shrinks a little for long names / large system fonts instead of
  // wrapping or clipping.
  const homeHeader = (
    <Text
      accessibilityRole="header"
      accessibilityLabel={`${greeting}, ${firstName}`}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      style={{
        color: theme.colors.textSecondary,
        fontSize: theme.golden.type.lead,
        lineHeight: theme.golden.lineHeight.lead,
      }}
    >
      {`${greeting}, `}
      <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.bold }}>{firstName}</Text>
    </Text>
  );
  return (
    <ScreenContainer
      tone="canvas"
      bottomInset={false}
      header={homeHeader}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <OfflineBanner />

      {/* Page title + active / overdue counts */}
      <Animated.View entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}>
        <PageTitle title={t('home.yourLoans')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.golden.spacing.f1 }}>
            <CountChip icon="checkmark-circle" count={activeLoans.length} label={t('home.active')} tone="success" />
            <CountChip
              icon={summary.overdueLoanCount > 0 ? 'warning' : 'checkmark-circle-outline'}
              count={summary.overdueLoanCount}
              label={t('home.overdue')}
              tone={summary.overdueLoanCount > 0 ? 'danger' : 'muted'}
            />
          </View>
        </PageTitle>
      </Animated.View>
      {/* Active loans */}
      <Animated.View entering={FadeInDown.duration(280).reduceMotion(ReduceMotion.System)}>
        <LoansTable loans={activeLoans} onOpen={openLoan} />
      </Animated.View>
    </ScreenContainer>
  );
}
