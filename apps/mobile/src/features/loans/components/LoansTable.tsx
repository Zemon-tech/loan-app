/**
 * LoansTable — Home "Your loans" list view: one table row per active loan
 * (Loan no. | Outstanding | Next EMI | Due date | Status). Takes LoanListItemVMs, so it renders
 * identically from mock data and from the live API. Tapping a row opens the loan. Informational
 * only: no payment action. Money via @app/shared formatINR (integer paise).
 */
import { Pressable, Text, View } from 'react-native';

import { formatDate, formatINR, type IsoDate } from '@app/shared';

import { Icon } from '@/components/ui';
import { useLoanQuery } from '@/features/api/queries';
import type { LoanListItemVM } from '@/features/api/vm';
import { useAppTheme } from '@/hooks/use-theme';

const DASH = '\u2014';

/** Column flex weights, shared by the header and every row so the columns line up. */
export const LOAN_TABLE_COLUMNS = {
  loan: 1.05,
  outstanding: 1.2,
  emi: 0.85,
  due: 0.95,
  status: 1.35,
} as const;

/**
 * Due date for a row. Mock VMs carry `nextDueDate` (null = none). Live list items have none
 * (`undefined`), so fall back to the loan detail's `nextCollectionDate`. Passing '' disables the
 * detail query, which also keeps mock mode off the network.
 */
function useNextDueDate(loan: LoanListItemVM): IsoDate | null {
  const needsDetail = loan.nextDueDate === undefined;
  const detail = useLoanQuery(needsDetail ? loan.loanId : '');
  if (!needsDetail) return loan.nextDueDate ?? null;
  return detail.data?.nextCollectionDate ?? null;
}

export function LoansTable({
  loans,
  onOpen,
}: {
  loans: LoanListItemVM[];
  onOpen: (loanId: string) => void;
}) {
  const theme = useAppTheme();
  const header = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontWeight: theme.typography.weight.semibold,
  } as const;

  return (
    <View
      style={{
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View
        accessibilityRole="header"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          backgroundColor: theme.colors.primarySoft,
        }}
      >
        <Text style={[header, { flex: LOAN_TABLE_COLUMNS.loan }]}>Loan no.</Text>
        <Text style={[header, { flex: LOAN_TABLE_COLUMNS.outstanding }]}>Outstanding</Text>
        <Text style={[header, { flex: LOAN_TABLE_COLUMNS.emi }]}>Next EMI</Text>
        <Text style={[header, { flex: LOAN_TABLE_COLUMNS.due }]}>Due date</Text>
        <Text style={[header, { flex: LOAN_TABLE_COLUMNS.status }]}>Status</Text>
      </View>
      {loans.map((loan, index) => (
        <LoanTableRow
          key={loan.loanId}
          loan={loan}
          first={index === 0}
          onPress={() => onOpen(loan.loanId)}
        />
      ))}
    </View>
  );
}

function LoanTableRow({
  loan,
  first,
  onPress,
}: {
  loan: LoanListItemVM;
  first: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const dueDate = useNextDueDate(loan);
  const overdue = loan.isOverdue;
  const emi = loan.emiAmountPaise > 0 ? formatINR(loan.emiAmountPaise) : DASH;
  const due = dueDate ? formatDate(dueDate) : DASH;

  const cell = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.body,
    fontWeight: theme.typography.weight.bold,
  } as const;

  const a11y = [
    `Loan ${loan.accountNumber}`,
    overdue ? 'overdue' : 'active',
    `Outstanding ${formatINR(loan.outstandingPaise)}`,
    loan.emiAmountPaise > 0 ? `Next EMI ${emi}` : null,
    dueDate ? `Due ${due}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens loan details"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: theme.touchTarget.min + 24,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: overdue ? theme.colors.dangerSoft : theme.colors.card,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text numberOfLines={1} style={[cell, { flex: LOAN_TABLE_COLUMNS.loan }]}>
        {loan.accountNumber}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[cell, { flex: LOAN_TABLE_COLUMNS.outstanding }]}
      >
        {formatINR(loan.outstandingPaise)}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[cell, { flex: LOAN_TABLE_COLUMNS.emi }]}
      >
        {emi}
      </Text>
      <Text
        numberOfLines={2}
        style={[cell, { flex: LOAN_TABLE_COLUMNS.due, fontSize: theme.typography.size.caption }]}
      >
        {due}
      </Text>
      <View style={{ flex: LOAN_TABLE_COLUMNS.status }}>
        <LoanStatusPill overdue={overdue} />
      </View>
    </Pressable>
  );
}

/** Colour + icon/dot + text label, never colour alone (PRD 6.4). */
export function LoanStatusPill({ overdue }: { overdue: boolean }) {
  const theme = useAppTheme();
  const color = overdue ? theme.colors.danger : theme.colors.success;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingVertical: theme.spacing.xs + 1,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: overdue ? theme.colors.dangerSoft : theme.colors.successSoft,
        borderWidth: overdue ? 1 : 0,
        borderColor: theme.colors.danger,
      }}
    >
      {overdue ? (
        <Icon name="warning-outline" size={12} color="danger" />
      ) : (
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      )}
      <Text
        numberOfLines={1}
        style={{
          color,
          fontSize: theme.typography.size.metadata,
          fontWeight: theme.typography.weight.semibold,
        }}
      >
        {overdue ? 'Overdue' : 'Active'}
      </Text>
    </View>
  );
}
