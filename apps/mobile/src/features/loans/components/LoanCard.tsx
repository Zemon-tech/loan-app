/**
 * LoanCard — the single reusable card for a loan (Home list). Takes a LoanListItemVM (live and
 * mock both feed VMs via the adapters). Every number has a label beside it so Outstanding /
 * Overdue can never be confused; the status badge pairs colour with a label + icon. Tapping
 * opens the workspace. No payment action. Money via @app/shared formatINR (integer paise).
 */
import { Text, View } from 'react-native';

import { formatINR } from '@app/shared';

import { Card, Icon, PressableScale, StatusBadge } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

import type { LoanListItemVM } from '@/features/api/vm';

export interface LoanCardProps {
  loan: LoanListItemVM;
  onPress: () => void;
}

export function LoanCard({ loan, onPress }: LoanCardProps) {
  const theme = useAppTheme();
  const overdue = loan.isOverdue;

  const label = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontWeight: theme.typography.weight.medium,
  } as const;

  const a11y = [
    `Loan account ${loan.accountNumber}`,
    loan.status === 'OVERDUE' ? 'overdue' : 'active',
    `Outstanding ${formatINR(loan.outstandingPaise)}`,
    overdue ? `Overdue ${formatINR(loan.overdueAmountPaise)}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens loan details"
      haptic
      activeScale={0.98}
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
          </View>
          <StatusBadge status={loan.status === 'OVERDUE' ? 'OVERDUE' : loan.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE'} />
        </View>

        {/* Outstanding */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={label}>Outstanding</Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.title + 2,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            {formatINR(loan.outstandingPaise)}
          </Text>
        </View>

        {/* Overdue + chevron */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: overdue ? theme.colors.dangerSoft : theme.colors.primarySoft,
          }}
        >
          <View style={{ flex: 1 }}>
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
                  {formatINR(loan.overdueAmountPaise)}
                </Text>
              </View>
            ) : (
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                View loan details
              </Text>
            )}
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
    </PressableScale>
  );
}
