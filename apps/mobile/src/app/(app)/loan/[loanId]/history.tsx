/**
 * S8: Transaction History — PRD 8.8. Type filter + record count, grouped by month with a net
 * credit per month. Each row: type icon, type + tag, mode and date, reference, signed amount.
 * Tap opens a receipt-style bottom sheet.
 *
 * TODO (M-08):
 *  - GET /v1/loans/{loanId}/transactions?cursor=&limit=20; infinite scroll via cursor
 *  - pull-to-refresh; financial-year filter; empty state from the API; i18n
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, StateScroll, StateView } from '@/components/ui';
import { formatDate, formatINR, formatMonthYear, monthKey } from '@/features/loans/format';
import {
  TXN_STYLE,
  TransactionSheet,
  netCredit,
  signedAmount,
} from '@/features/loans/components/TransactionSheet';
import { findPlaceholderLoan, type Loan, type Transaction, type TransactionType } from '@/features/loans/placeholderData';
import { HistorySkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState, NoTransactionsState, SupportSheet } from '@/features/system/components/SystemStates';
import { useMockQuery } from '@/features/system/mockQuery';
import { useAppTheme } from '@/hooks/use-theme';

type TypeFilter = 'ALL' | TransactionType;

const FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'ALL', label: 'All types' },
  { key: 'PAYMENT', label: 'Payments' },
  { key: 'CHARGE', label: 'Charges' },
  { key: 'DISCOUNT', label: 'Discounts' },
  { key: 'ADJUSTMENT', label: 'Adjustments' },
];

function netLabel(n: number): string {
  return `Net: ${n < 0 ? '\u2212' : '+'}${formatINR(Math.abs(n))}`;
}

export default function HistoryScreen() {
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const load = useCallback(() => findPlaceholderLoan(loanId ?? ''), [loanId]);
  const query = useMockQuery(`loan:${loanId}`, load);

  if (query.status === 'session_expired') return <Redirect href="/session-expired" />;
  if (query.status === 'loading') return <HistorySkeleton />;
  if (query.status === 'error') {
    return (
      <StateScroll>
        <LoadErrorState onRetry={query.refetch} />
      </StateScroll>
    );
  }
  if (!query.data) {
    return (
      <StateScroll>
        <StateView
          icon="document-text-outline"
          title="Loan not found"
          message="We could not find this loan. Go back to Home and try again."
        />
      </StateScroll>
    );
  }
  if (query.data.transactions.length === 0) return <EmptyHistory />;
  return <HistoryContent loan={query.data} />;
}

function EmptyHistory() {
  const theme = useAppTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <StateScroll>
      <NoTransactionsState onHelp={() => setHelpOpen(true)} />
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, paddingHorizontal: theme.spacing.xs }}>
        <Icon name="information-circle-outline" size={18} color="textSecondary" />
        <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
          This app shows your loan information only. Payments are not made in this app.
        </Text>
      </View>
      <SupportSheet visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </StateScroll>
  );
}

function HistoryContent({ loan }: { loan: Loan }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TypeFilter>('ALL');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  const { sections, total } = useMemo(() => {
    const all = [...loan.transactions]
      .filter((t) => filter === 'ALL' || t.type === filter)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    const map = new Map<number, { title: string; data: Transaction[] }>();
    for (const t of all) {
      const k = monthKey(t.date);
      if (!map.has(k)) map.set(k, { title: formatMonthYear(t.date), data: [] });
      map.get(k)!.data.push(t);
    }
    return { sections: [...map.values()], total: all.length };
  }, [loan, filter]);

  return (
    <View style={{ flex: 1 }}>
      {/* Filter ribbon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: theme.spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}
        >
          {FILTERS.map((f) => {
            const isSelected = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setFilter(f.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 40,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  backgroundColor: isSelected ? theme.colors.textPrimary : theme.colors.card,
                }}
              >
                {f.key === 'ALL' ? (
                  <Icon name="options-outline" size={16} color={isSelected ? 'background' : 'textSecondary'} />
                ) : null}
                <Text
                  style={{
                    color: isSelected ? theme.colors.background : theme.colors.textSecondary,
                    fontSize: theme.typography.size.caption,
                    fontWeight: theme.typography.weight.semibold,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text
          accessibilityLiveRegion="polite"
          style={{ paddingHorizontal: theme.spacing.lg, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}
        >
          {total} {total === 1 ? 'record' : 'records'}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xl }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.body, padding: theme.spacing.xl }}>
            No transactions yet.
          </Text>
        }
        ListFooterComponent={
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.lg }}>
            <Icon name="information-circle-outline" size={18} color="textSecondary" />
            <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
              Historical records only. Payments are not made in this app.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              backgroundColor: theme.colors.canvas,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
                {section.title}
              </Text>
              <View style={{ paddingVertical: 2, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 2, fontWeight: theme.typography.weight.semibold }}>
                  {section.data.length} {section.data.length === 1 ? 'event' : 'events'}
                </Text>
              </View>
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
              {netLabel(netCredit(section.data))}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const s = TXN_STYLE[item.type];
          const first = index === 0;
          const last = index === section.data.length - 1;
          const icon = item.type === 'PAYMENT' && item.mode === 'Cash' ? 'cash-outline' : s.icon;
          const detail = item.type === 'PAYMENT' ? (item.modeDetail ?? item.mode ?? 'Payment') : item.type === 'CHARGE' ? 'Administrative charge' : item.type === 'DISCOUNT' ? 'Concession' : 'Ledger correction';
          const ref = item.referenceNo ? `Ref: ${item.referenceNo}` : item.receiptNo ? `Receipt: ${item.receiptNo}` : null;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${detail}, ${formatDate(item.date)}, ${signedAmount(item)}`}
              accessibilityHint="Opens transaction details"
              onPress={() => {
                setSelected(item);
                setOpen(true);
              }}
              style={({ pressed }) => ({
                marginHorizontal: theme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                minHeight: 76,
                padding: theme.spacing.md,
                backgroundColor: theme.colors.card,
                borderTopLeftRadius: first ? theme.radius.lg : 0,
                borderTopRightRadius: first ? theme.radius.lg : 0,
                borderBottomLeftRadius: last ? theme.radius.lg : 0,
                borderBottomRightRadius: last ? theme.radius.lg : 0,
                borderBottomWidth: last ? 0 : 1,
                borderBottomColor: theme.colors.border,
                marginBottom: last ? theme.spacing.md : 0,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors[s.bg], alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={20} color={s.fg} />
              </View>

              <View style={{ flex: 1, gap: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
                    {item.label}
                  </Text>
                  {s.tag ? (
                    <View style={{ paddingVertical: 1, paddingHorizontal: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors[s.bg] }}>
                      <Text style={{ color: theme.colors[s.fg], fontSize: theme.typography.size.caption - 2, fontWeight: theme.typography.weight.semibold }}>
                        {s.tag}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                  {detail} {'\u2022'} {formatDate(item.date)}
                </Text>
                {ref ? (
                  <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, opacity: 0.8, fontSize: theme.typography.size.caption - 2 }}>
                    {ref}
                  </Text>
                ) : null}
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.colors[s.amount], fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
                  {signedAmount(item)}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 2 }}>{s.caption}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <TransactionSheet
        visible={open}
        transaction={selected}
        accountNumber={loan.accountNumber}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
