/**
 * S8: Transaction History. One row per ledger entry, newest first, grouped by month. Each row
 * shows exactly what the API provides: description, date, direction (credit / debit), amount,
 * and for payments the payment mode and channel, each with a visible label. Nothing is invented: reference numbers, receipts,
 * times and splits are not in the API, so they are not shown. Pagination loads more on scroll.
 *
 * Direction: credit = money paid or credited to the loan (green, arrow down);
 * debit = charges or amounts given out (red, arrow up). Colour is always paired with an icon and
 * a text label.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate, formatINR } from '@app/shared';

import { Icon, StateScroll, StateView, type IconName } from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { useLoanData, useTransactionsData } from '@/features/api/dataSource';
import type { TransactionVM } from '@/features/api/vm';
import { HistorySkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState, NoTransactionsState, SupportSheet } from '@/features/system/components/SystemStates';
import { useAppTheme } from '@/hooks/use-theme';

const DASH = '\u2014';

const DIRECTION: Record<
  TransactionVM['direction'],
  { icon: IconName; fg: AppColorRole; bg: AppColorRole; label: string; sign: string }
> = {
  credit: { icon: 'arrow-down', fg: 'success', bg: 'successSoft', label: 'Credit', sign: '+' },
  debit: { icon: 'arrow-up', fg: 'danger', bg: 'dangerSoft', label: 'Debit', sign: '\u2212' },
};

/** Icons for the API's paymentMode / channel values (unknown values get a neutral icon). */
const MODE_ICON: Record<string, IconName> = {
  Cash: 'cash-outline',
  Bank: 'business-outline',
  Wallet: 'wallet-outline',
  UPI: 'qr-code-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};
const CHANNEL_ICON: Record<string, IconName> = {
  Agent: 'person-outline',
  Office: 'storefront-outline',
  Online: 'globe-outline',
};

interface Section {
  key: string;
  title: string;
  data: TransactionVM[];
}

/** Group consecutive rows by month, keeping the API's newest-first order. */
function groupByMonth(items: TransactionVM[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const key = item.date ? item.date.slice(0, 7) : 'unknown';
    let current = sections[sections.length - 1];
    if (!current || current.key !== key) {
      // "14 Jun 2026" -> "Jun 2026"
      const title = item.date ? formatDate(item.date).split(' ').slice(1).join(' ') : 'Date not available';
      current = { key, title, data: [] };
      sections.push(current);
    }
    current.data.push(item);
  }
  return sections;
}

export default function HistoryScreen() {
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const loanQuery = useLoanData(loanId ?? '');
  const txnQuery = useTransactionsData(loanId ?? '');

  if (txnQuery.status === 'session_expired' || loanQuery.status === 'session_expired') {
    return <Redirect href="/session-expired" />;
  }
  if (txnQuery.status === 'loading' || loanQuery.status === 'loading') {
    return <HistorySkeleton />;
  }
  if (txnQuery.status === 'error' || loanQuery.status === 'error') {
    return (
      <StateScroll>
        <LoadErrorState
          onRetry={() => {
            txnQuery.refetch();
            loanQuery.refetch();
          }}
        />
      </StateScroll>
    );
  }
  if (!txnQuery.data || !loanQuery.data) {
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
  if (txnQuery.data.transactions.length === 0) {
    return <EmptyHistory onRefresh={txnQuery.refetch} isRefreshing={txnQuery.isRefreshing} />;
  }
  return (
    <HistoryList
      transactions={txnQuery.data.transactions}
      totalCount={txnQuery.data.totalCount}
      onEndReached={txnQuery.fetchNextPage}
      hasNextPage={txnQuery.hasNextPage}
      isFetchingNextPage={txnQuery.isFetchingNextPage}
      onRefresh={txnQuery.refetch}
      isRefreshing={txnQuery.isRefreshing}
    />
  );
}

function EmptyHistory({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  const theme = useAppTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <NoTransactionsState onHelp={() => setHelpOpen(true)} />
      <SupportSheet visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </ScrollView>
  );
}

/** Labelled detail: small caption on top ("Payment mode"), icon + value underneath ("UPI"). */
function MetaField({ label, icon, value }: { label: string; icon: IconName; value: string }) {
  const theme = useAppTheme();
  const g = theme.golden;
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: g.type.small }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={16} color="textPrimary" />
        <Text style={{ color: theme.colors.textPrimary, fontSize: g.type.caption + 1, fontWeight: theme.typography.weight.semibold }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
function TransactionRow({ item, first, last }: { item: TransactionVM; first: boolean; last: boolean }) {
  const theme = useAppTheme();
  const g = theme.golden;
  const d = DIRECTION[item.direction] ?? DIRECTION.credit;
  const date = item.date ? formatDate(item.date) : DASH;
  const amount = `${d.sign}${formatINR(item.amountPaise)}`;
  const mode = item.paymentMode;
  const channel = item.channel;

  const a11y = [d.label, amount, item.description, date, mode ? `Payment mode ${mode}` : null, channel ? `Channel ${channel}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={{
        marginHorizontal: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: g.spacing.f2,
        padding: g.spacing.f2 + 3,
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: first ? theme.radius.lg : 0,
        borderTopRightRadius: first ? theme.radius.lg : 0,
        borderBottomLeftRadius: last ? theme.radius.lg : 0,
        borderBottomRightRadius: last ? theme.radius.lg : 0,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
        marginBottom: last ? theme.spacing.md : 0,
      }}
    >
      <View
        style={{
          width: g.controlHeight - g.spacing.f2,
          height: g.controlHeight - g.spacing.f2,
          borderRadius: (g.controlHeight - g.spacing.f2) / 2,
          backgroundColor: theme.colors[d.bg],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={d.icon} size={20} color={d.fg} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{ color: theme.colors.textPrimary, fontSize: g.type.body, lineHeight: g.lineHeight.body, fontWeight: theme.typography.weight.semibold }}
        >
          {item.description || DASH}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: g.type.caption }}>{date}</Text>
        {mode || channel ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: g.spacing.f3, rowGap: g.spacing.f1, marginTop: g.spacing.f1 }}>
            {mode ? <MetaField label="Payment mode" icon={MODE_ICON[mode] ?? 'ellipsis-horizontal-circle-outline'} value={mode} /> : null}
            {channel ? <MetaField label="Channel" icon={CHANNEL_ICON[channel] ?? 'ellipsis-horizontal-circle-outline'} value={channel} /> : null}
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ color: theme.colors[d.fg], fontSize: g.type.body, lineHeight: g.lineHeight.body, fontWeight: theme.typography.weight.bold }}>
          {amount}
        </Text>
        <Text style={{ color: theme.colors[d.fg], fontSize: g.type.caption, fontWeight: theme.typography.weight.semibold }}>
          {d.label}
        </Text>
      </View>
    </View>
  );
}

interface HistoryListProps {
  transactions: TransactionVM[];
  totalCount: number;
  onEndReached: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function HistoryList({
  transactions,
  totalCount,
  onEndReached,
  hasNextPage,
  isFetchingNextPage,
  onRefresh,
  isRefreshing,
}: HistoryListProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const sections = useMemo(() => groupByMonth(transactions), [transactions]);

  const keyExtractor = useCallback((t: TransactionVM, index: number) => `${t.rawDate}-${index}`, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.golden.spacing.f1, backgroundColor: theme.colors.canvas }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.golden.type.lead,
            lineHeight: theme.golden.lineHeight.lead,
            fontWeight: theme.typography.weight.bold,
          }}
        >
          {section.title}
        </Text>
      </View>
    ),
    [theme],
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: TransactionVM; index: number; section: Section }) => (
      <TransactionRow item={item} first={index === 0} last={index === section.data.length - 1} />
    ),
    [],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      stickySectionHeadersEnabled
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews
      renderSectionHeader={renderSectionHeader}
      renderItem={renderItem}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) onEndReached();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xl }}
      ListHeaderComponent={
        <Text
          accessibilityLiveRegion="polite"
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xs,
            color: theme.colors.textSecondary,
            fontSize: theme.golden.type.caption,
          }}
        >
          {totalCount} {totalCount === 1 ? 'transaction' : 'transactions'}
        </Text>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ paddingVertical: theme.spacing.lg }} />
        ) : null
      }
    />
  );
}