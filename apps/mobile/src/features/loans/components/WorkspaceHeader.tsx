/**
 * WorkspaceHeader — shared header for Overview | History.
 * Back button, account + title, status badge, and the segmented navigation.
 * Rendered once by the workspace layout so it stays put while the segment content changes.
 */
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon, SegmentedControl } from '@/components/ui';
import { useLoanData } from '@/features/api/dataSource';
import { showUnbackedScreens } from '@/features/api/features';
import { useAppTheme } from '@/hooks/use-theme';

import type { Loan } from '../placeholderData';

const SHOW_SEGMENTS = showUnbackedScreens();

export type WorkspaceSegment = 'overview' | 'history';

const TITLES: Record<WorkspaceSegment, string> = {
  overview: 'Loan overview',
  history: 'Transaction History',
};

const OPTIONS: { key: WorkspaceSegment; label: string }[] = [
  { key: 'overview', label: 'Overview' },
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
  const loanData = useLoanData(loanId);
  const vm = loanData.status === 'success' ? loanData.data : null;
  const status = vm?.status ?? loan?.status ?? null;

  function onChange(next: WorkspaceSegment) {
    // Replace (not push) so Back always returns to Home, not through the segments.
    if (next === 'overview') router.replace({ pathname: '/loan/[loanId]', params: { loanId } });
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flex: 1 }}>
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

          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.subtitle,
              fontWeight: theme.typography.weight.bold,
              flexShrink: 1,
            }}
          >
            {TITLES[segment]}
          </Text>
        </View>
      </View>

      {SHOW_SEGMENTS ? (
        <SegmentedControl options={OPTIONS} value={segment} onChange={onChange} />
      ) : null}
    </View>
  );
}
