import { Redirect, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showUnbackedScreens } from '@/features/api/features';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import {
  WorkspaceHeader,
  type WorkspaceSegment,
} from '@/features/loans/components/WorkspaceHeader';
import { OfflineBanner } from '@/features/system/components/SystemStates';
import { useAppTheme } from '@/hooks/use-theme';

const SHOW_SUB_SCREENS = showUnbackedScreens();

/**
 * Loan Workspace: one shared header + segmented control (Overview | History)
 * above whichever segment is active, so the two screens feel like a single place.
 * The tab bar is hidden for this route (see (app)/_layout.tsx).
 */
export default function LoanWorkspaceLayout() {
  useSecureScreen();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const pathname = usePathname();

  const segment: WorkspaceSegment = pathname.endsWith('/history') ? 'history' : 'overview';

  // History is hidden when the sub-screens flag is off — a direct deep link redirects to overview.
  if (!SHOW_SUB_SCREENS && segment !== 'overview') {
    return <Redirect href={{ pathname: '/loan/[loanId]', params: { loanId: loanId ?? '' } }} />;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top + theme.spacing.sm, backgroundColor: theme.colors.canvas }}>
      <WorkspaceHeader
        loanId={loanId ?? ''}
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
