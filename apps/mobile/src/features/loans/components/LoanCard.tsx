/**
 * LoanCard — the single reusable card for a loan (Home list). Every number has a label beside
 * it so Outstanding / Overdue / Next due can never be confused. Tapping opens the workspace.
 * No payment action.
 */
import { Pressable, Text, View } from 'react-native';

import { Card, Icon, ProgressBar, StatusBadge } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

import { dueLabel, formatINR } from '../format';
import type { Loan } from '../placeholderData';

export interface LoanCardProps {
  loan: Loan;
  onPress: () => void;
}

export function LoanCard({ loan, onPress }: LoanCardProps) {
  const theme = useAppTheme();
  const overdue = loan.overdueAmount > 0;
  const percent = Math.round((loan.emisPaid / loan.totalEmis) * 100);
  const progressText = `${loan.emisPaid} of ${loan.totalEmis} EMIs paid`;

  const label = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontWeight: theme.typography.weight.medium,
  } as const;

  const a11y = [
    `Loan account ${loan.accountNumber}, ${loan.productName}`,
    loan.status === 'OVERDUE' ? 'overdue' : 'active',
    `Outstanding ${formatINR(loan.outstanding)}`,
    progressText,
    overdue ? `Overdue ${formatINR(loan.overdueAmount)}` : null,
    loan.nextDue ? `Next due ${formatINR(loan.nextDue.amount)}, ${dueLabel(loan.nextDue.date)}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens loan details"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card
        tone="card"
        style={{ borderRadius: theme.radius.xl, padding: theme.spacing.lg, gap: theme.spacing.md }}
      >
        {/* Account + status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2 }}>
            <Text style={label}>Loan account</Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.subtitle,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {loan.accountNumber}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
              {loan.productName}
            </Text>
          </View>
          <StatusBadge status={loan.status === 'OVERDUE' ? 'OVERDUE' : 'ACTIVE'} />
        </View>

        {/* Outstanding + progress */}
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={label}>Outstanding</Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.title + 2,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {formatINR(loan.outstanding)}
            </Text>
          </View>
          <ProgressBar ratio={loan.emisPaid / loan.totalEmis} accessibilityLabel={progressText} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              {progressText}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              {percent}%
            </Text>
          </View>
        </View>

        {/* Next due / overdue + chevron */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.primarySoft,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', gap: theme.spacing.lg, flexWrap: 'wrap' }}>
            {loan.nextDue ? (
              <View style={{ gap: 2 }}>
                <Text style={label}>Next due</Text>
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.typography.size.subtitle,
                    fontWeight: theme.typography.weight.bold,
                  }}
                >
                  {formatINR(loan.nextDue.amount)}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                  {dueLabel(loan.nextDue.date)}
                </Text>
              </View>
            ) : null}
            {overdue ? (
              <View style={{ gap: 2 }}>
                <Text style={[label, { color: theme.colors.danger }]}>Overdue</Text>
                <Text
                  style={{
                    color: theme.colors.danger,
                    fontSize: theme.typography.size.subtitle,
                    fontWeight: theme.typography.weight.bold,
                  }}
                >
                  {formatINR(loan.overdueAmount)}
                </Text>
                <Text style={{ color: theme.colors.danger, fontSize: theme.typography.size.caption }}>
                  {loan.overdueInstallments} installments
                </Text>
              </View>
            ) : null}
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevron-forward" size={18} color="textPrimary" />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
