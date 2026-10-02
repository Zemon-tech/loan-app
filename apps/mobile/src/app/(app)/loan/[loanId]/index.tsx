/**
 * S6: Loan Detail (Overview) — structured skeleton (PRD 8.6).
 *
 * Layout per docs/DECISIONS.md: BIG outstanding number + "X of Y paid" + next due,
 * a collapsed "See full breakup", then two buttons to Schedule and History.
 * NO payment button or link anywhere (tracker only).
 *
 * TODO (M-06):
 *  - GET /v1/loans/{loanId}; loading/error states; pull-to-refresh; "Last updated {asOf}"
 *  - full breakup rows (payable, late fee, overdue interest, recovery, discount, adjusted,
 *    installment paid, outstanding) — every charge on its own line, zero values shown (C3)
 *  - optional Key Facts (APR / KFS) block only when present
 *  - footer disclaimer: "Payments are not made in this app."
 *  - format money via @app/shared formatINR; strings to i18n
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, ListRow, ScreenContainer, StatusBadge } from '@/components/ui';
import { findPlaceholderLoan } from '@/features/loans/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

export default function LoanOverviewScreen() {
  const theme = useAppTheme();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const loan = findPlaceholderLoan(loanId ?? '');
  const [showBreakup, setShowBreakup] = useState(false);

  return (
    <ScreenContainer>
      {/* Header: account + status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.subtitle,
            fontWeight: theme.typography.weight.semibold as '600',
          }}
        >
          {loan?.accountNumber ?? loanId}
        </Text>
        {loan ? <StatusBadge status={loan.status} /> : null}
      </View>

      {/* BIG outstanding number */}
      <Card>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
          Amount you still owe
        </Text>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.heading,
            fontWeight: theme.typography.weight.bold as '700',
          }}
        >
          {loan?.outstandingDisplay ?? '\u20B9--'}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
          {loan?.progressText ?? '-- of -- EMIs paid'}
        </Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body }}>
          {loan?.nextDueText ?? 'Next due: --'}
        </Text>
      </Card>

      {/* Collapsed breakup */}
      <Card style={{ padding: 0 }}>
        <ListRow
          label={showBreakup ? 'Hide full breakup' : 'See full breakup'}
          onPress={() => setShowBreakup((v) => !v)}
        />
        {showBreakup ? (
          <View>
            {/* TODO (M-06): real financial rows from loan.financials */}
            <ListRow label="Payable amount" value={'\u20B91,20,000'} />
            <ListRow label="(+) Overdue interest" value={'\u20B913,167'} />
            <ListRow label="(+) Late fee" value={'\u20B90'} />
            <ListRow label="(+) Recovery charges" value={'\u20B90'} />
            <ListRow label="(-) Discount" value={'\u20B90'} />
            <ListRow label="(-) Installment paid" value={'\u20B939,000'} />
            <ListRow label="Total outstanding" value={'\u20B994,167'} />
          </View>
        ) : null}
      </Card>

      {/* Two buttons (not a toggle) */}
      <Button
        label="View EMI schedule"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/loan/[loanId]/schedule', params: { loanId: loanId ?? '' } })
        }
      />
      <Button
        label="View payment history"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/loan/[loanId]/history', params: { loanId: loanId ?? '' } })
        }
      />

      {/* Footer disclaimer (tracker only) */}
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
        This app shows your loan information only. Payments are not made in this app.
      </Text>
    </ScreenContainer>
  );
}
