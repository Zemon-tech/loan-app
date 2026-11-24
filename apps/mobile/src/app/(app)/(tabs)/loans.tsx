/**
 * S5: Home (tab) — which loans do I have, what do I owe on each, am I overdue. Purely
 * informational: no payment action. Sticky header (greeting + avatar) pinned at the top; below it
 * the active loans as a table (Loan no. | Outstanding | Next EMI | Due date | Status) or a bar
 * chart, plus a collapsible "Closed loans" row.
 *
 * Both modes feed VMs (LoanListItemVM) through the dataSource seam, so mock and live render the
 * same UI. Live list responses carry no due date; LoansTable fills it from the loan detail's
 * nextCollectionDate (weekly loans only), otherwise shows a dash. The OfflineBanner is fed by live
 * connectivity in live mode and by the mock env in mock mode (both via useIsOffline).
 */
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { BrandMark, Icon, IconTile, ScreenContainer } from '@/components/ui';
import { buildLoansSummary } from '@/features/api/adapter';
import { useLoansData, usePhotoData, useProfileData } from '@/features/api/dataSource';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import { HomeSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState, NoLoansState, OfflineBanner } from '@/features/system/components/SystemStates';
import { LoansChart } from '@/features/loans/components/LoansChart';
import { LoansTable } from '@/features/loans/components/LoansTable';
import type { LoanListItemVM } from '@/features/api/vm';
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

function AppBar() {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <BrandMark size={36} />
      <Text
        accessibilityRole="header"
        style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title, fontWeight: theme.typography.weight.bold }}
      >
        ALANG CREDITS
      </Text>
    </View>
  );
}

type ViewMode = 'list' | 'chart';

function HomeContent({ loans, onRefresh }: { loans: LoanListItemVM[]; onRefresh: () => void }) {
  const theme = useAppTheme();
  const profileQuery = useProfileData();
  const profile = profileQuery.status === 'success' ? profileQuery.data : null;
  const photoQuery = usePhotoData(profile?.hasPhoto ?? false);
  const photoUri = photoQuery.status === 'success' ? photoQuery.data : null;
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    profileQuery.refetch();
    photoQuery.refetch();
    setRefreshing(false);
  };

  const firstName = profile?.name ? profile.name.split(/\s+/)[0] : 'Borrower';
  const initials = profile?.initials || (profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'B');

  const summary = useMemo(() => buildLoansSummary(loans), [loans]);
  const { activeLoans, closedLoans } = summary;
  const allClosed = activeLoans.length === 0;
  // Closed loans stay collapsed, unless there is nothing else to show.
  const [closedOpen, setClosedOpen] = useState(allClosed);

  const homeHeader = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <BrandMark size={48} />
      <View style={{ flex: 1 }} accessible accessibilityRole="header" accessibilityLabel={`${greeting()}, ${firstName}`}>
        <Text
          numberOfLines={1}
          style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}
        >
          {greeting()}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontWeight: theme.typography.weight.bold,
          }}
        >
          {firstName}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to Profile"
        onPress={() => router.push('/account')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: theme.colors.primary,
            }}
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: theme.colors.primary,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.body,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {initials}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
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

      {/* Title row: heading + counts, list/chart toggle */}
      <Animated.View
        entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.title,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            Your loans
          </Text>
          <Text style={{ fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
            {allClosed ? (
              <Text style={{ color: theme.colors.textSecondary }}>No active loans</Text>
            ) : (
              <Text style={{ color: theme.colors.success }}>{`${activeLoans.length} active`}</Text>
            )}
            {summary.overdueLoanCount > 0 ? (
              <Text style={{ color: theme.colors.danger }}>{`  \u00B7  ${summary.overdueLoanCount} overdue`}</Text>
            ) : null}
          </Text>
        </View>
        {!allClosed ? <ViewToggle value={viewMode} onChange={setViewMode} /> : null}
      </Animated.View>

      {/* Active loans: table or chart */}
      {!allClosed ? (
        <Animated.View entering={FadeInDown.duration(280).reduceMotion(ReduceMotion.System)}>
          {viewMode === 'list' ? (
            <LoansTable loans={activeLoans} onOpen={openLoan} />
          ) : (
            <LoansChart loans={activeLoans} onOpen={openLoan} />
          )}
        </Animated.View>
      ) : null}

      {/* Closed loans: quieter, dashed, expands in place */}
      {closedLoans.length > 0 ? (
        <Animated.View
          layout={LinearTransition.duration(220).easing(Easing.out(Easing.cubic))}
          style={{
            borderRadius: theme.radius.xl,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.colors.border,
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
              gap: theme.spacing.md,
              minHeight: theme.touchTarget.min + 24,
              paddingHorizontal: theme.spacing.lg,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <IconTile name="checkmark-done-outline" size={44} background="mutedSurface" color="textSecondary" />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.important,
                  fontWeight: theme.typography.weight.bold,
                }}
              >
                Closed loans
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
                {closedLoans.length} {closedLoans.length === 1 ? 'loan' : 'loans'}
              </Text>
            </View>
            <Icon name={closedOpen ? 'chevron-down' : 'chevron-forward'} size={20} color="textSecondary" />
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
                    accessibilityLabel={`Closed loan ${loan.accountNumber}. Fully paid.`}
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
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.size.body,
                          fontWeight: theme.typography.weight.medium,
                        }}
                      >
                        {loan.accountNumber}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                        Fully paid
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

/** Two-icon list / chart switch (informational views of the same loans). */
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const theme = useAppTheme();
  const options: { key: ViewMode; icon: 'list' | 'bar-chart-outline'; label: string }[] = [
    { key: 'list', icon: 'list', label: 'List view' },
    { key: 'chart', icon: 'bar-chart-outline', label: 'Chart view' },
  ];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 4,
        gap: 4,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.mutedSurface,
      }}
    >
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            style={{
              width: 48,
              height: 40,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? theme.colors.surface : 'transparent',
            }}
          >
            <Icon name={o.icon} size={20} color={selected ? 'textPrimary' : 'textSecondary'} />
          </Pressable>
        );
      })}
    </View>
  );
}
