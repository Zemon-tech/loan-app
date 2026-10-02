/**
 * S5: My Loans (tab) — loan list, structured skeleton (PRD 8.5).
 *
 * SINGLE-LOAN SHORTCUT (decision b, docs/DECISIONS.md):
 *   In the real app, if the customer has exactly 1 loan, open its detail directly
 *   (skip this list). The list is shown only for 2+ loans. The prototype always shows
 *   the list with 2 placeholder loans so this screen is visible to devs.
 *
 * TODO (M-05):
 *  - GET /v1/loans; show skeleton / empty / error states; pull-to-refresh
 *  - summary card: total outstanding + overdue banner (totals.*)
 *  - group Active/Overdue vs Closed (collapsed)
 *  - format money via @app/shared formatINR; strings to i18n
 */
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card, ScreenContainer, StatusBadge } from '@/components/ui';
import { PLACEHOLDER_LOANS, type PlaceholderLoan } from '@/features/loans/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

export default function LoansScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer>
      {/* Summary card (placeholder) */}
      <Card>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          Total outstanding
        </Text>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontWeight: theme.typography.weight.bold as '700',
          }}
        >
          {'\u20B9'}94,167
        </Text>
        {/* TODO: overdue banner when totals.overdueInstallmentsPaise > 0 */}
      </Card>

      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.size.caption,
          fontWeight: theme.typography.weight.semibold as '600',
        }}
      >
        YOUR LOANS
      </Text>

      {PLACEHOLDER_LOANS.map((loan) => (
        <LoanCard key={loan.loanId} loan={loan} />
      ))}
    </ScreenContainer>
  );
}

function LoanCard({ loan }: { loan: PlaceholderLoan }) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/loan/[loanId]', params: { loanId: loan.loanId } })}
      accessibilityRole="button"
      accessibilityLabel={`Loan ${loan.accountNumber}, ${loan.productName}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.subtitle,
              fontWeight: theme.typography.weight.semibold as '600',
            }}
          >
            {loan.accountNumber}
          </Text>
          <StatusBadge status={loan.status} />
        </View>

        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          {loan.productName}
        </Text>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontWeight: theme.typography.weight.bold as '700',
          }}
        >
          {loan.outstandingDisplay}
        </Text>

        {/* Progress bar (placeholder) */}
        <View
          style={{
            height: 8,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.round(loan.progressRatio * 100)}%`,
              height: '100%',
              backgroundColor: theme.colors.primary,
            }}
          />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          {loan.progressText}
        </Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body }}>
          {loan.nextDueText}
        </Text>
      </Card>
    </Pressable>
  );
}
