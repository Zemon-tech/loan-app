/**
 * S8: Transaction History — structured skeleton (PRD 8.8).
 *
 * TODO (M-08):
 *  - GET /v1/loans/{loanId}/transactions?cursor=&limit=20; infinite scroll via cursor
 *  - group by month; row: date, mode icon, type label, signed amount, reference
 *  - tap row -> bottom sheet with details; pull-to-refresh; empty state
 *  - format money via @app/shared formatINR; strings to i18n
 */
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, ScreenContainer } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

// Placeholder rows (TODO: real transactions).
const PLACEHOLDER_TXNS = [
  { id: 't1', date: '11 Sep 2026', type: 'Payment', mode: 'Online', amount: '\u20B95,000' },
  { id: 't2', date: '05 Sep 2026', type: 'Payment', mode: 'Cash', amount: '\u20B91,200' },
  { id: 't3', date: '01 Sep 2026', type: 'Charge', mode: '-', amount: '\u20B9150' },
];

export default function HistoryScreen() {
  const theme = useAppTheme();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();

  return (
    <ScreenContainer>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
        Loan {loanId}
      </Text>

      {/* TODO: group by month; bottom-sheet detail on tap */}
      {PLACEHOLDER_TXNS.map((txn) => (
        <Card key={txn.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.body,
                  fontWeight: theme.typography.weight.semibold as '600',
                }}
              >
                {txn.type}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                {txn.date} · {txn.mode}
              </Text>
            </View>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body }}>
              {txn.amount}
            </Text>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}
