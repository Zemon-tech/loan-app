/**
 * S7: Repayment Schedule — structured skeleton (PRD 8.7).
 *
 * TODO (M-07):
 *  - GET /v1/loans/{loanId}/schedule; render with FlashList (up to ~600 rows)
 *  - summary chips (Paid/Partial/Overdue/Upcoming) + filter All|Paid|Pending|Overdue
 *  - auto-scroll to next due; "Jump to next due" floating button; monthly sticky headers
 *  - derive schedule via @app/shared computeSchedule; strings to i18n
 */
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, ScreenContainer, StatusBadge } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

// Placeholder rows (TODO: real schedule items).
const PLACEHOLDER_ROWS = [
  { n: 1, date: '16 Jun 2026', amount: '\u20B91,200', status: 'PAID' as const },
  { n: 33, date: '18 Jul 2026', amount: '\u20B91,200', status: 'PARTIAL' as const },
  { n: 50, date: '04 Aug 2026', amount: '\u20B91,200', status: 'OVERDUE' as const },
  { n: 96, date: '19 Sep 2026', amount: '\u20B91,200', status: 'DUE_TODAY' as const },
  { n: 97, date: '20 Sep 2026', amount: '\u20B91,200', status: 'UPCOMING' as const },
];

export default function ScheduleScreen() {
  const theme = useAppTheme();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();

  return (
    <ScreenContainer>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
        Loan {loanId}
      </Text>

      {/* TODO: summary chips + filter control */}
      {PLACEHOLDER_ROWS.map((row) => (
        <Card key={row.n}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.body,
                  fontWeight: theme.typography.weight.semibold as '600',
                }}
              >
                EMI {row.n}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                Due {row.date} · {row.amount}
              </Text>
            </View>
            <StatusBadge status={row.status} />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}
