/**
 * LoansTable — Home "Your loans" list view: one table row per active loan
 *   Loan no. (+ loan date, end date) | Amount | EMI x Tenure (+ total payable)
 * Takes LoanListItemVMs, so it renders identically from mock data and from the live API. Tapping
 * a row opens the loan. Informational only: no payment action. Money via @app/shared
 * (integer paise); the total is `totalPayablePaise(EMI, tenure)`, never float math.
 *
 * Data source: the live LIST response has only the account number, EMI, outstanding and overdue.
 * Loan date (`loanDate`), end date (`maturityDate`), loan amount (`financedAmount`) and tenure
 * (`numberOfInstallments`) come from the loan DETAIL call, which is cached per loan and shared
 * with the loan screen. Mock list items already carry them, so mock never touches the network.
 * Anything missing renders as a dash; the table never invents a value.
 */
import { Pressable, Text, View } from 'react-native';

import { formatDate, formatINR, totalPayablePaise, type IsoDate, type Paise } from '@app/shared';

import { Icon } from '@/components/ui';
import { useLoanQuery } from '@/features/api/queries';
import type { LoanListItemVM } from '@/features/api/vm';
import { useAppTheme } from '@/hooks/use-theme';

const DASH = '\u2014';
const TIMES = 'x';

/** Column flex weights, shared by the header and every row so the columns line up. */
export const LOAN_TABLE_COLUMNS = {
  loan: 1.4,
  amount: 0.9,
  emi: 1.2,
} as const;

interface RowDetails {
  loanDate: IsoDate | null;
  maturityDate: IsoDate | null;
  principalPaise: Paise | null;
  tenure: number | null;
}

/**
 * Row details. Mock items carry them (`loanDate !== undefined`). Live list items do not, so fall
 * back to the loan detail. Passing '' disables the detail query, which also keeps mock mode off
 * the network. While the detail loads or if it fails, the fields are null (shown as a dash).
 */
function useRowDetails(loan: LoanListItemVM): RowDetails {
  const needsDetail = loan.loanDate === undefined;
  const detail = useLoanQuery(needsDetail ? loan.loanId : '');
  if (!needsDetail) {
    return {
      loanDate: loan.loanDate ?? null,
      maturityDate: loan.maturityDate ?? null,
      principalPaise: loan.principalPaise ?? null,
      tenure: loan.numberOfInstallments ?? null,
    };
  }
  const d = detail.data;
  return {
    loanDate: d?.loanDate ?? null,
    maturityDate: d?.maturityDate ?? null,
    principalPaise: d?.principalPaise ?? null,
    tenure: d?.numberOfInstallments ?? null,
  };
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
        <Text style={[header, { flex: LOAN_TABLE_COLUMNS.amount }]}>Amount</Text>
        <Text style={[header, { flex: LOAN_TABLE_COLUMNS.emi }]}>EMI x Tenure</Text>
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
  const { loanDate, maturityDate, principalPaise, tenure } = useRowDetails(loan);
  const overdue = loan.isOverdue;

  const emiText = loan.emiAmountPaise > 0 ? formatINR(loan.emiAmountPaise) : null;
  const total = totalPayablePaise(loan.emiAmountPaise, tenure);
  const amountText = principalPaise != null && principalPaise > 0 ? formatINR(principalPaise) : DASH;
  const startText = loanDate ? formatDate(loanDate) : DASH;
  const endText = maturityDate ? formatDate(maturityDate) : DASH;

  const cell = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.body,
    fontWeight: theme.typography.weight.bold,
  } as const;
  const sub = { color: theme.colors.textSecondary, fontSize: theme.typography.size.caption } as const;

  const a11y = [
    `Loan ${loan.accountNumber}`,
    overdue ? 'overdue' : null,
    loanDate ? `Taken on ${startText}` : null,
    maturityDate ? `Ends on ${endText}` : null,
    principalPaise != null && principalPaise > 0 ? `Amount ${amountText}` : null,
    emiText ? (tenure ? `EMI ${emiText} for ${tenure} instalments` : `EMI ${emiText}`) : null,
    total != null ? `Total ${formatINR(total)}` : null,
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
        alignItems: 'flex-start',
        minHeight: theme.touchTarget.min + 24,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: overdue ? theme.colors.dangerSoft : theme.colors.card,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Loan no. + loan date + end date (+ overdue flag) */}
      <View style={{ flex: LOAN_TABLE_COLUMNS.loan, gap: 2, paddingRight: theme.spacing.xs }}>
        <Text numberOfLines={1} style={cell}>
          {loan.accountNumber}
        </Text>
        <Text numberOfLines={1} style={sub}>
          {startText}
        </Text>
        <Text numberOfLines={1} style={[sub, { color: theme.colors.interactive }]}>
          {`Ends ${endText}`}
        </Text>
        {overdue ? (
          <View style={{ marginTop: theme.spacing.xs }}>
            <LoanStatusPill overdue />
          </View>
        ) : null}
      </View>

      {/* Loan amount */}
      <Text numberOfLines={1} adjustsFontSizeToFit style={[cell, { flex: LOAN_TABLE_COLUMNS.amount }]}>
        {amountText}
      </Text>

      {/* EMI x Tenure, with the total the borrower pays below */}
      <View style={{ flex: LOAN_TABLE_COLUMNS.emi, gap: 2 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={cell}>
          {emiText ? (tenure ? `${emiText} ${TIMES} ${tenure}` : emiText) : DASH}
        </Text>
        {total != null ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: theme.colors.success, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}
          >
            {formatINR(total)}
          </Text>
        ) : null}
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
