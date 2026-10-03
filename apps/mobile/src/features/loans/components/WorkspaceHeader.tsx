/**
 * WorkspaceHeader — shared header for Overview | Schedule | History.
 * Back button, account + title, status badge, and the segmented navigation.
 * Rendered once by the workspace layout so it stays put while the segment content changes.
 */
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BrandMark, Icon, SegmentedControl, StatusBadge } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

import type { Loan } from '../placeholderData';

export type WorkspaceSegment = 'overview' | 'schedule' | 'history';

const TITLES: Record<WorkspaceSegment, string> = {
  overview: 'Loan Overview',
  schedule: 'Repayment Schedule',
  history: 'Transaction History',
};

const OPTIONS: { key: WorkspaceSegment; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'history', label: 'History' },
];

/** Back if there is history (normal case); otherwise fall back to Home (deep link / refresh). */
function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/loans');
}

export function WorkspaceHeader({
  loanId,
  loan,
  segment,
}: {
  loanId: string;
  loan?: Loan;
  segment: WorkspaceSegment;
}) {
  const theme = useAppTheme();

  function onChange(next: WorkspaceSegment) {
    // Replace (not push) so Back always returns to Home, not through the segments.
    if (next === 'overview') router.replace({ pathname: '/loan/[loanId]', params: { loanId } });
    else if (next === 'schedule') router.replace({ pathname: '/loan/[loanId]/schedule', params: { loanId } });
    else router.replace({ pathname: '/loan/[loanId]/history', params: { loanId } });
  }

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        gap: theme.spacing.md,
        backgroundColor: theme.colors.canvas,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          hitSlop={8}
          onPress={goBackOrHome}
          style={({ pressed }) => ({
            width: theme.touchTarget.min,
            height: theme.touchTarget.min,
            marginLeft: -theme.spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="chevron-back" size={26} color="textPrimary" />
        </Pressable>

        <BrandMark size={32} />

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
            Loan Workspace
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.subtitle,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {TITLES[segment]}
            </Text>
            {loan ? (
              <StatusBadge
                status={loan.status === 'OVERDUE' ? 'OVERDUE' : loan.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE'}
              />
            ) : null}
          </View>
        </View>
      </View>

      <SegmentedControl options={OPTIONS} value={segment} onChange={onChange} />
    </View>
  );
}
