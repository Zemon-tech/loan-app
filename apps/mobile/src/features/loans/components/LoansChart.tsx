/**
 * LoansChart — Home "Your loans" chart view: one horizontal bar per active loan, sized by
 * outstanding balance, with the overdue part of that balance in the danger colour. Built from
 * plain Views (no chart library). Every bar carries its numbers as text, so colour is never the
 * only signal. Takes LoanListItemVMs, so mock and live render the same. Informational only.
 */
import { Pressable, Text, View } from 'react-native';

import { formatINR } from '@app/shared';

import type { LoanListItemVM } from '@/features/api/vm';
import { useAppTheme } from '@/hooks/use-theme';
import { LoanStatusPill } from './LoansTable';

const BAR_HEIGHT = 14;

export function LoansChart({
  loans,
  onOpen,
}: {
  loans: LoanListItemVM[];
  onOpen: (loanId: string) => void;
}) {
  const theme = useAppTheme();
  const max = Math.max(1, ...loans.map((l) => l.outstandingPaise));

  const legendText = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.metadata,
    fontWeight: theme.typography.weight.medium,
  } as const;

  return (
    <View
      style={{
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
      }}
    >
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.size.caption,
          fontWeight: theme.typography.weight.semibold,
        }}
      >
        Outstanding by loan
      </Text>

      {loans.map((loan) => {
        const overdue = Math.min(loan.overdueAmountPaise, loan.outstandingPaise);
        const barFlex = loan.outstandingPaise / max;
        const overdueFlex = loan.outstandingPaise > 0 ? overdue / loan.outstandingPaise : 0;
        return (
          <Pressable
            key={loan.loanId}
            accessibilityRole="button"
            accessibilityLabel={[
              `Loan ${loan.accountNumber}`,
              `Outstanding ${formatINR(loan.outstandingPaise)}`,
              loan.isOverdue ? `Overdue ${formatINR(loan.overdueAmountPaise)}` : 'No overdue',
            ].join('. ')}
            accessibilityHint="Opens loan details"
            onPress={() => onOpen(loan.loanId)}
            style={({ pressed }) => ({ gap: theme.spacing.sm, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.body,
                  fontWeight: theme.typography.weight.bold,
                }}
              >
                {loan.accountNumber}
              </Text>
              <LoanStatusPill overdue={loan.isOverdue} />
            </View>

            <View
              style={{
                height: BAR_HEIGHT,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.mutedSurface,
                overflow: 'hidden',
                flexDirection: 'row',
              }}
            >
              <View
                style={{
                  flex: barFlex,
                  flexDirection: 'row',
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.pill,
                  overflow: 'hidden',
                }}
              >
                {overdueFlex > 0 ? (
                  <>
                    <View style={{ flex: 1 - overdueFlex }} />
                    <View style={{ flex: overdueFlex, backgroundColor: theme.colors.danger }} />
                  </>
                ) : null}
              </View>
              <View style={{ flex: 1 - barFlex }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={legendText}>
                Outstanding{' '}
                <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.bold }}>
                  {formatINR(loan.outstandingPaise)}
                </Text>
              </Text>
              {loan.isOverdue ? (
                <Text style={[legendText, { color: theme.colors.danger }]}>
                  Overdue{' '}
                  <Text style={{ fontWeight: theme.typography.weight.bold }}>
                    {formatINR(loan.overdueAmountPaise)}
                  </Text>
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
