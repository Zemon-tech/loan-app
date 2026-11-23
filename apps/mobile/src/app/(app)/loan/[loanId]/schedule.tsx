/**
 * S7: Repayment Schedule — PRD 8.7.
 * Pinned Next Due Hero Card, summary tiles, Upcoming | Paid | Overdue | All filters,
 * month-grouped list with sticky headers, and smooth zero-jump navigation.
 *
 * Fully optimized VirtualizedList with getItemLayout, memoized renderItem,
 * and custom React.memo comparators to prevent frame drops and VirtualizedList warnings.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { computeSchedule, todayIST, type ScheduleInput } from '@app/shared';

import { Icon, StateScroll, StateView, StatusBadge, type IconName } from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { useLoanData } from '@/features/api/dataSource';
import { dayDiff, formatDate, formatINR, formatMonthYear, monthKey } from '@/features/loans/format';
import {
  findPlaceholderLoan,
  type Installment,
  type Loan,
  type InstallmentStatus,
  type NextDue,
} from '@/features/loans/placeholderData';
import { ScheduleSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState } from '@/features/system/components/SystemStates';
import { useAppTheme } from '@/hooks/use-theme';

type Filter = 'pending' | 'paid' | 'overdue' | 'all';

const MATCH: Record<Filter, (s: InstallmentStatus) => boolean> = {
  pending: (s) => s === 'DUE_TODAY' || s === 'UPCOMING' || s === 'OVERDUE' || s === 'PARTIAL',
  paid: (s) => s === 'PAID',
  overdue: (s) => s === 'OVERDUE' || s === 'PARTIAL',
  all: () => true,
};

type Row =
  | {
      kind: 'header';
      key: string;
      title: string;
      count: number;
      isCurrent: boolean;
      unresolved: boolean;
      sectionSubtitle?: string;
    }
  | { kind: 'item'; key: string; item: Installment };

function hasNote(item: Installment): boolean {
  return (
    item.status === 'OVERDUE' ||
    item.status === 'PARTIAL' ||
    item.status === 'PAID' ||
    item.status === 'DUE_TODAY'
  );
}

const HEADER_HEIGHT = 44;
const CARD_WITH_NOTE_HEIGHT = 130;
const CARD_STANDARD_HEIGHT = 90;

export default function ScheduleScreen() {
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const loanQuery = useLoanData(loanId ?? '');

  if (loanQuery.status === 'session_expired') return <Redirect href="/session-expired" />;
  if (loanQuery.status === 'loading') return <ScheduleSkeleton />;
  if (loanQuery.status === 'error') {
    return (
      <StateScroll>
        <LoadErrorState onRetry={loanQuery.refetch} />
      </StateScroll>
    );
  }

  const vm = loanQuery.data;
  let loan: Loan | null = null;

  if (vm) {
    const weeklyOffMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    const weeklyOffWeekday = vm.weeklyOff ? weeklyOffMap[vm.weeklyOff] : undefined;

    const firstDate = vm.startDate ?? vm.loanDate ?? todayIST();
    const frequency = vm.payFrequency ?? 'DAILY';
    const totalInstallments = vm.numberOfInstallments && vm.numberOfInstallments > 0 ? vm.numberOfInstallments : 1;

    const input: ScheduleInput = {
      firstInstallmentDate: firstDate,
      payFrequency: frequency,
      totalInstallments,
      emiAmountPaise: vm.emiAmountPaise,
      totalInstallmentPaidPaise: vm.totalPaidPaise,
      asOfDate: todayIST(),
      weeklyOffWeekday,
      maturityDate: vm.maturityDate ?? undefined,
      dbClosed: vm.status === 'CLOSED',
    };

    const scheduleResult = computeSchedule(input);

    const schedule: Installment[] = scheduleResult.items.map((item) => ({
      emiNumber: item.number,
      dueDate: new Date(item.dueDate),
      amount: item.amountPaise / 100,
      status: item.status,
      paidAmount: item.paidPaise > 0 ? item.paidPaise / 100 : undefined,
    }));

    const nextDueItem = scheduleResult.nextDue;
    let nextDue: NextDue | undefined = nextDueItem
      ? {
          emiNumber: scheduleResult.items.find((i) => i.dueDate === nextDueItem.date)?.number ?? 1,
          amount: nextDueItem.amountPaise / 100,
          date: new Date(nextDueItem.date),
        }
      : undefined;

    // If nextDue is null (e.g. all installments are overdue or matured), resolve the installment closest to today
    if (!nextDue && schedule.length > 0) {
      const now = new Date().getTime();
      const unpaid = schedule.filter((i) => i.status !== 'PAID');
      const pool = unpaid.length > 0 ? unpaid : schedule;
      const first = pool[0];
      if (first) {
        let closest = first;
        let minDiff = Math.abs(first.dueDate.getTime() - now);
        for (const item of pool) {
          const diff = Math.abs(item.dueDate.getTime() - now);
          if (diff < minDiff) {
            minDiff = diff;
            closest = item;
          }
        }
        nextDue = {
          emiNumber: closest.emiNumber,
          amount: closest.amount,
          date: closest.dueDate,
        };
      }
    }

    loan = {
      loanId: vm.loanId,
      accountNumber: vm.accountNumber,
      productName: 'Loan',
      status: vm.status === 'CLOSED' ? 'CLOSED' : vm.status === 'OVERDUE' ? 'OVERDUE' : 'ACTIVE',
      scheme: 'Standard',
      branch: 'Main Branch',
      loanDate: vm.loanDate ? new Date(vm.loanDate) : new Date(),
      firstEmiDate: vm.startDate ? new Date(vm.startDate) : new Date(),
      maturityDate: vm.maturityDate ? new Date(vm.maturityDate) : new Date(),
      emiAmount: vm.emiAmountPaise / 100,
      frequency: vm.payFrequency === 'DAILY' ? 'Daily' : 'Monthly',
      totalEmis: totalInstallments,
      emisPaid: scheduleResult.installmentsPaid,
      loanAmount: vm.principalPaise / 100,
      totalInterest: 0,
      totalPayable: (vm.principalPaise + (vm.dues?.totalDuePaise ?? 0)) / 100,
      lateFee: (vm.dues?.lateFeesPaise ?? 0) / 100,
      overdueInterest: (vm.dues?.overdueInterestPaise ?? 0) / 100,
      recoveryCharges: (vm.dues?.recoveryVisitChargesPaise ?? 0) / 100,
      discount: (vm.dues?.discountPaise ?? 0) / 100,
      totalDue: (vm.dues?.totalDuePaise ?? 0) / 100,
      totalPaid: vm.totalPaidPaise / 100,
      outstanding: vm.outstandingPaise / 100,
      overdueAmount: vm.overdueAmountPaise / 100,
      overdueInstallments: scheduleResult.overdueInstallmentsCount,
      nextDue,
      paidOnline: { amount: 0, count: 0 },
      paidCash: { amount: 0, count: 0 },
      schedule,
      transactions: [],
    };
  } else {
    loan = findPlaceholderLoan(loanId ?? '') ?? null;
  }

  if (!loan) {
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

  return <ScheduleContent loan={loan} onRefresh={loanQuery.refetch} />;
}

function ScheduleContent({ loan, onRefresh }: { loan: Loan; onRefresh?: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const schedule = loan.schedule;

  const counts = useMemo(() => {
    const c = { all: schedule.length, paid: 0, partial: 0, overdue: 0, pending: 0 };
    for (const i of schedule) {
      if (i.status === 'PAID') c.paid++;
      else if (i.status === 'PARTIAL') c.partial++;
      else if (i.status === 'OVERDUE') c.overdue++;
      else c.pending++;
    }
    return c;
  }, [schedule]);

  const [filter, setFilter] = useState<Filter>('all');
  const listRef = useRef<FlatList<Row>>(null);

  const nearestEmiNumber = useMemo(() => {
    if (loan.nextDue?.emiNumber) return loan.nextDue.emiNumber;
    const dueToday = schedule.find((i) => i.status === 'DUE_TODAY');
    if (dueToday) return dueToday.emiNumber;
    const upcoming = schedule.find((i) => i.status === 'UPCOMING' || i.status === 'PARTIAL');
    if (upcoming) return upcoming.emiNumber;
    const first = schedule[0];
    if (first) {
      const now = new Date().getTime();
      let closest = first;
      let minDiff = Math.abs(first.dueDate.getTime() - now);
      for (const item of schedule) {
        const diff = Math.abs(item.dueDate.getTime() - now);
        if (diff < minDiff) {
          minDiff = diff;
          closest = item;
        }
      }
      return closest.emiNumber;
    }
    return undefined;
  }, [loan.nextDue, schedule]);

  const { rows, targetIndex, headerIndices, layouts } = useMemo(() => {
    const out: Row[] = [];
    const headers: number[] = [];
    let visible = schedule.filter((i) => MATCH[filter](i.status));

    // Show recent payments first in paid history
    if (filter === 'paid') {
      visible = [...visible].reverse();
    }

    const thisMonth = monthKey(new Date());
    let currentKey = -1;
    let header: Extract<Row, { kind: 'header' }> | null = null;
    let targetIdx = -1;

    for (const item of visible) {
      const k = monthKey(item.dueDate);
      if (!header || k !== currentKey) {
        currentKey = k;
        headers.push(out.length);
        header = {
          kind: 'header',
          key: `h_${k}_${headers.length}`,
          title: formatMonthYear(item.dueDate),
          count: 0,
          isCurrent: k === thisMonth,
          unresolved: false,
        };
        out.push(header);
      }
      header.count += 1;
      if (item.status === 'OVERDUE' || item.status === 'PARTIAL') header.unresolved = true;
      if (item.emiNumber === nearestEmiNumber) {
        targetIdx = out.length;
      }
      out.push({ kind: 'item', key: `i_${item.emiNumber}`, item });
    }

    let offset = 0;
    const itemLayouts: { length: number; offset: number }[] = [];
    for (const r of out) {
      const length = r.kind === 'header' ? HEADER_HEIGHT : (hasNote(r.item) ? CARD_WITH_NOTE_HEIGHT : CARD_STANDARD_HEIGHT);
      itemLayouts.push({ length, offset });
      offset += length;
    }

    return { rows: out, targetIndex: targetIdx, headerIndices: headers, layouts: itemLayouts };
  }, [schedule, filter, nearestEmiNumber]);

  const stickyHeaderIndices = useMemo(() => {
    if (rows.length === 0) return [];
    return headerIndices.filter((idx) => idx < rows.length);
  }, [headerIndices, rows.length]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => {
      const layout = layouts[index];
      if (layout) return { length: layout.length, offset: layout.offset, index };
      const last = layouts.length > 0 ? layouts[layouts.length - 1] : undefined;
      const fallbackOffset = last ? last.offset + last.length : 0;
      return { length: 0, offset: fallbackOffset, index };
    },
    [layouts],
  );

  const initialAnchorDone = useRef(false);

  // Anchor to nearest due on initial load
  useEffect(() => {
    if (!initialAnchorDone.current && targetIndex > 0 && targetIndex < rows.length) {
      initialAnchorDone.current = true;
      const timer = setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: targetIndex, viewPosition: 0, animated: false });
        } catch {
          // Handled by onScrollToIndexFailed
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [targetIndex, rows.length]);

  const handleFilterChange = useCallback((nextFilter: Filter) => {
    setFilter(nextFilter);
    try {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch {
      // Non-fatal
    }
  }, []);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      const avg = Number.isFinite(info.averageItemLength) && info.averageItemLength > 0 ? info.averageItemLength : 100;
      try {
        listRef.current?.scrollToOffset({ offset: avg * info.index, animated: false });
      } catch {}

      setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0, animated: false });
        } catch {}
      }, 50);
    },
    [],
  );

  const keyExtractor = useCallback((r: Row) => (r ? r.key : Math.random().toString()), []);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (!item) return null;
      if (item.kind === 'header') {
        return <MonthHeader row={item} />;
      }
      return <InstallmentCard item={item.item} isNextDue={item.item.emiNumber === nearestEmiNumber} />;
    },
    [nearestEmiNumber],
  );

  const tiles: { label: string; count: number; unit: string; fg: AppColorRole; bg: AppColorRole }[] = [
    { label: 'Upcoming', count: counts.pending, unit: 'EMIs', fg: 'primary', bg: 'primarySoft' },
    { label: 'Paid', count: counts.paid, unit: 'EMIs', fg: 'success', bg: 'successSoft' },
    { label: 'Partial', count: counts.partial, unit: counts.partial === 1 ? 'EMI' : 'EMIs', fg: 'warning', bg: 'warningSoft' },
    { label: 'Overdue', count: counts.overdue, unit: 'EMIs', fg: 'danger', bg: 'dangerSoft' },
  ];

  const totalPendingCount = counts.pending + counts.overdue + counts.partial;
  const filters: { key: Filter; label: string; count: number; dot?: AppColorRole }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending', label: 'Up Next', count: totalPendingCount, dot: 'primary' },
    { key: 'paid', label: 'Previous', count: counts.paid, dot: 'success' },
    ...(counts.overdue + counts.partial > 0
      ? [{ key: 'overdue' as Filter, label: 'Overdue', count: counts.overdue + counts.partial, dot: 'danger' as AppColorRole }]
      : []),
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Sticky Tab: Segmented Filter Ribbon + Summary Stats */}
      <View style={{ paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.sm, backgroundColor: theme.colors.canvas, gap: theme.spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}
        >
          {filters.map((f) => {
            const selected = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => handleFilterChange(f.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 38,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? theme.colors.secondary : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.secondary : theme.colors.border,
                }}
              >
                {f.dot && !selected ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors[f.dot] }} />
                ) : null}
                <Text
                  style={{
                    color: selected ? theme.colors.onSecondary : theme.colors.textSecondary,
                    fontSize: theme.typography.size.caption,
                    fontWeight: theme.typography.weight.semibold,
                  }}
                >
                  {f.label} ({f.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sticky Summary stats tiles (Upcoming, Paid, Partial, Overdue) */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xs }}>
          {tiles.map((t) => (
            <View
              key={t.label}
              accessible
              accessibilityLabel={`${t.label}: ${t.count} ${t.unit}`}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors[t.bg],
              }}
            >
              <Text
                style={{
                  color: theme.colors[t.fg],
                  fontSize: theme.typography.size.caption - 2,
                  fontWeight: theme.typography.weight.bold,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {t.label}
              </Text>
              <Text
                style={{
                  color: theme.colors[t.fg],
                  fontSize: theme.typography.size.subtitle - 1,
                  fontWeight: theme.typography.weight.bold,
                }}
              >
                {t.count}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 2 }}>
                {t.unit}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Virtualised Timeline List */}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={keyExtractor}
        extraData={filter}
        getItemLayout={getItemLayout}
        initialScrollIndex={targetIndex > 0 && targetIndex < rows.length ? targetIndex : undefined}
        renderItem={renderItem}
        stickyHeaderIndices={stickyHeaderIndices}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={false}
        onScrollToIndexFailed={onScrollToIndexFailed}
        contentContainerStyle={{ paddingTop: theme.spacing.sm, paddingBottom: insets.bottom + theme.spacing.xl }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.body, padding: theme.spacing.xl }}>
            No installments match this filter.
          </Text>
        }
        ListFooterComponent={
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
              margin: theme.spacing.lg,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Icon name="information-circle-outline" size={22} color="textSecondary" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
                Informational ledger view
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
                This app shows your loan information only. Payments are not made in this app.
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const MonthHeader = React.memo(function MonthHeader({ row }: { row: Extract<Row, { kind: 'header' }> }) {
  const theme = useAppTheme();
  const right = row.sectionSubtitle ?? (row.isCurrent ? 'Current' : row.unresolved ? 'Unresolved' : 'Cleared');
  const rightColor = row.isCurrent ? 'primary' : row.unresolved ? 'danger' : 'success';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        height: HEADER_HEIGHT,
        backgroundColor: theme.colors.canvas,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
          {row.title}
        </Text>
        <View style={{ paddingVertical: 2, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 2, fontWeight: theme.typography.weight.semibold }}>
            {row.count} {row.count === 1 ? 'installment' : 'installments'}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.colors[rightColor], fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
        {right}
      </Text>
    </View>
  );
});

const InstallmentCard = React.memo(
  function InstallmentCard({
    item,
    isNextDue,
  }: {
    item: Installment;
    isNextDue?: boolean;
  }) {
    const theme = useAppTheme();
    const isToday = item.status === 'DUE_TODAY';
    const remaining = item.amount - (item.paidAmount ?? 0);

    let note: { text: string; icon: IconName; color: AppColorRole; bg?: AppColorRole } | null = null;
    if (item.status === 'OVERDUE') {
      const days = -dayDiff(item.dueDate, new Date());
      note = { text: `Overdue by ${days} ${days === 1 ? 'day' : 'days'}`, icon: 'time-outline', color: 'danger', bg: 'dangerSoft' };
    } else if (item.status === 'PARTIAL') {
      note = { text: `Paid ${formatINR(item.paidAmount ?? 0)} \u2022 Remaining balance ${formatINR(remaining)}`, icon: 'information-circle-outline', color: 'warning', bg: 'warningSoft' };
    } else if (item.status === 'PAID') {
      note = { text: `Cleared on ${formatDate(item.dueDate)} via ${item.clearedVia ?? 'lender records'}`, icon: 'checkmark-done-outline', color: 'success' };
    } else if (isToday) {
      note = { text: 'This installment is due today.', icon: 'shield-checkmark-outline', color: 'textPrimary', bg: 'primarySoft' };
    }

    return (
      <View
        accessible
        accessibilityLabel={`EMI ${item.emiNumber}, due ${formatDate(item.dueDate)}, ${formatINR(item.amount)}, ${item.status.replace('_', ' ').toLowerCase()}${note ? `. ${note.text}` : ''}`}
        style={{
          marginHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.sm,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isNextDue ? theme.colors.primary : theme.colors.border,
          height: note ? CARD_WITH_NOTE_HEIGHT - theme.spacing.sm : CARD_STANDARD_HEIGHT - theme.spacing.sm,
        }}
      >

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: isToday || isNextDue ? theme.typography.size.subtitle : theme.typography.size.body,
                  fontWeight: theme.typography.weight.bold,
                }}
              >
                EMI #{item.emiNumber}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={{ color: isToday ? theme.colors.primary : theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: isToday ? theme.typography.weight.semibold : theme.typography.weight.regular }}>
              {isToday ? `Due: Today, ${formatDate(item.dueDate)}` : `Due: ${formatDate(item.dueDate)}`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: isToday || isNextDue ? theme.typography.size.heading : theme.typography.size.body,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {formatINR(item.amount)}
            </Text>
            {item.status === 'PARTIAL' ? (
              <Text style={{ color: theme.colors.warning, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
                Remaining {formatINR(remaining)}
              </Text>
            ) : isToday ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>Scheduled cycle</Text>
            ) : null}
          </View>
        </View>

        {note ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: note.bg ? theme.spacing.sm : 0,
              paddingHorizontal: note.bg ? theme.spacing.md : 0,
              borderRadius: theme.radius.md,
              backgroundColor: note.bg ? theme.colors[note.bg] : 'transparent',
            }}
          >
            <Icon name={note.icon} size={15} color={note.color} />
            <Text style={{ flex: 1, color: theme.colors[note.color], fontSize: theme.typography.size.caption - 1 }}>{note.text}</Text>
          </View>
        ) : null}
      </View>
    );
  },
  (prev, next) =>
    prev.item.emiNumber === next.item.emiNumber &&
    prev.item.status === next.item.status &&
    prev.item.amount === next.item.amount &&
    prev.item.paidAmount === next.item.paidAmount &&
    prev.isNextDue === next.isNextDue,
);
