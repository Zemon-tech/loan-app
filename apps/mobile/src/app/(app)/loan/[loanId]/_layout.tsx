import { Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  WorkspaceHeader,
  type WorkspaceSegment,
} from '@/features/loans/components/WorkspaceHeader';
import { findPlaceholderLoan } from '@/features/loans/placeholderData';
import { OfflineBanner } from '@/features/system/components/SystemStates';
import { useAppTheme } from '@/hooks/use-theme';

/**
 * Loan Workspace: one shared header + segmented control (Overview | Schedule | History)
 * above whichever segment is active, so the three screens feel like a single place.
 * The tab bar is hidden for this route (see (app)/_layout.tsx).
 */
export default function LoanWorkspaceLayout() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const pathname = usePathname();

  const segment: WorkspaceSegment = pathname.endsWith('/schedule')
    ? 'schedule'
    : pathname.endsWith('/history')
      ? 'history'
      : 'overview';

  return (
    <View style={{ flex: 1, paddingTop: insets.top + theme.spacing.sm, backgroundColor: theme.colors.canvas }}>
      <WorkspaceHeader
        loanId={loanId ?? ''}
        loan={findPlaceholderLoan(loanId ?? '')}
        segment={segment}
      />
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
        <OfflineBanner />
      </View>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
