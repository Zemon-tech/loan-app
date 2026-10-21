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
import { FlatList, Pressable, ScrollView, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, StateScroll, StateView, StatusBadge, type IconName } from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { MOCK_TODAY } from '@/features/loans/clock';
import { dayDiff, formatDate, formatINR, formatMonthYear, monthKey } from '@/features/loans/format';
import {
  findPlaceholderLoan,
  type Installment,
  type Loan,
  type InstallmentStatus,
} from '@/features/loans/placeholderData';
import { ScheduleSkeleton } from '@/features/system/components/Skeletons';
import { LoadErrorState } from '@/features/system/components/SystemStates';
import { useMockQuery } from '@/features/system/mockQuery';
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
  const load = useCallback(() => findPlaceholderLoan(loanId ?? ''), [loanId]);
  const query = useMockQuery(`loan:${loanId}`, load);

  if (query.status === 'session_expired') return <Redirect href="/session-expired" />;
  if (query.status === 'loading') return <ScheduleSkeleton />;
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
  return <ScheduleContent loan={query.data} />;
}

function ScheduleContent({ loan }: { loan: Loan }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
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

  const defaultFilter: Filter = counts.pending + counts.overdue + counts.partial > 0 ? 'pending' : 'paid';
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const [direction, setDirection] = useState<'up' | 'down' | 'here'>('here');
  const listRef = useRef<FlatList<Row>>(null);
  const targetRef = useRef(-1);

  const nextDueNumber = loan.nextDue?.emiNumber;

  const { rows, targetIndex, headerIndices, layouts } = useMemo(() => {
    const out: Row[] = [];
    const headers: number[] = [];
    let visible = schedule.filter((i) => MATCH[filter](i.status));

    // Show recent payments first in paid history
    if (filter === 'paid') {
      visible = [...visible].reverse();
    }

    const thisMonth = monthKey(MOCK_TODAY);
    let currentKey = -1;
    let header: Extract<Row, { kind: 'header' }> | null = null;
    for (const item of visible) {
      const k = monthKey(item.dueDate);
      if (!header || k !== currentKey) {
        currentKey = k;
        headers.push(out.length);
        header = {
          kind: 'header',
          key: `h_${k}`,
          title: formatMonthYear(item.dueDate),
          count: 0,
          isCurrent: k === thisMonth,
          unresolved: false,
        };
        out.push(header);
      }
      header.count += 1;
      if (item.status === 'OVERDUE' || item.status === 'PARTIAL') header.unresolved = true;
      out.push({ kind: 'item', key: `i_${item.emiNumber}`, item });
    }
    const idx = out.findIndex((r) => r.kind === 'item' && r.item.emiNumber === nextDueNumber);

    // Pre-calculate exact layouts for getItemLayout to bypass native measurements
    let offset = 0;
    const itemLayouts: { length: number; offset: number }[] = [];
    for (const r of out) {
      const length = r.kind === 'header' ? HEADER_HEIGHT : (hasNote(r.item) ? CARD_WITH_NOTE_HEIGHT : CARD_STANDARD_HEIGHT);
      itemLayouts.push({ length, offset });
      offset += length;
    }

    return { rows: out, targetIndex: idx, headerIndices: headers, layouts: itemLayouts };
  }, [schedule, filter, nextDueNumber]);

  useEffect(() => {
    targetRef.current = targetIndex;
  }, [targetIndex]);

  const handleFilterChange = useCallback((nextFilter: Filter) => {
    setFilter(nextFilter);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const scrollToTarget = useCallback(
    (animated: boolean) => {
      if (targetIndex < 0) return;
      listRef.current?.scrollToIndex({ index: targetIndex, viewPosition: 0.15, animated });
    },
    [targetIndex],
  );

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const target = targetRef.current;
    const indices = viewableItems.map((v) => v.index ?? -1).filter((i) => i >= 0);
    if (target < 0 || indices.length === 0) return;
    if (indices.includes(target)) return setDirection('here');
    setDirection(target < Math.min(...indices) ? 'up' : 'down');
  }, []);

  const keyExtractor = useCallback((r: Row) => r.key, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => {
      const layout = layouts[index];
      if (layout) return { length: layout.length, offset: layout.offset, index };
      return { length: 100, offset: index * 100, index };
    },
    [layouts],
  );

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header') {
        return <MonthHeader row={item} />;
      }
      return <InstallmentCard item={item.item} isNextDue={item.item.emiNumber === nextDueNumber} />;
    },
    [nextDueNumber],
  );

  const tiles: { label: string; count: number; unit: string; fg: AppColorRole; bg: AppColorRole }[] = [
    { label: 'Upcoming', count: counts.pending, unit: 'EMIs', fg: 'primary', bg: 'primarySoft' },
    { label: 'Paid', count: counts.paid, unit: 'EMIs', fg: 'success', bg: 'successSoft' },
    { label: 'Partial', count: counts.partial, unit: counts.partial === 1 ? 'EMI' : 'EMIs', fg: 'warning', bg: 'warningSoft' },
    { label: 'Overdue', count: counts.overdue, unit: 'EMIs', fg: 'danger', bg: 'dangerSoft' },
  ];

  const totalPendingCount = counts.pending + counts.overdue + counts.partial;
  const filters: { key: Filter; label: string; count: number; dot?: AppColorRole }[] = [
    { key: 'pending', label: 'Upcoming & Pending', count: totalPendingCount, dot: 'primary' },
    { key: 'paid', label: 'Paid', count: counts.paid, dot: 'success' },
    ...(counts.overdue + counts.partial > 0
      ? [{ key: 'overdue' as Filter, label: 'Overdue', count: counts.overdue + counts.partial, dot: 'danger' as AppColorRole }]
      : []),
    { key: 'all', label: 'All', count: counts.all },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Pillar 1: High-Clarity Next Due Hero Card */}
      {loan.nextDue ? (
        <NextDueHeroCard
          nextDue={loan.nextDue}
          direction={direction}
          showJump={filter === 'all' && direction !== 'here' && targetIndex >= 0}
          onJump={() => scrollToTarget(true)}
        />
      ) : (
        <View
          style={{
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.successSoft,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <Icon name="checkmark-circle-outline" size={20} color="success" />
          <Text style={{ color: theme.colors.success, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
            All installments settled. No pending payments.
          </Text>
        </View>
      )}

      {/* Summary tiles */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
        {tiles.map((t) => (
          <View
            key={t.label}
            accessible
            accessibilityLabel={`${t.label}: ${t.count} ${t.unit}`}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors[t.bg],
            }}
          >
            <Text style={{ color: theme.colors[t.fg], fontSize: theme.typography.size.caption - 2, fontWeight: theme.typography.weight.bold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              {t.label}
            </Text>
            <Text style={{ color: theme.colors[t.fg], fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
              {t.count}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 2 }}>{t.unit}</Text>
          </View>
        ))}
      </View>

      {/* Segmented Filter Pills */}
      <View style={{ paddingVertical: theme.spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
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
                  minHeight: 40,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? theme.colors.textPrimary : theme.colors.card,
                }}
              >
                {f.dot && !selected ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors[f.dot] }} />
                ) : null}
                <Text
                  style={{
                    color: selected ? theme.colors.background : theme.colors.textSecondary,
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
      </View>

      {/* Virtualised Timeline List */}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        renderItem={renderItem}
        stickyHeaderIndices={headerIndices}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xl }}
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

function NextDueHeroCard({
  nextDue,
  direction,
  showJump,
  onJump,
}: {
  nextDue: { emiNumber: number; amount: number; date: Date };
  direction: 'up' | 'down' | 'here';
  showJump: boolean;
  onJump: () => void;
}) {
  const theme = useAppTheme();
  const diff = dayDiff(nextDue.date, MOCK_TODAY);

  let urgencyLabel = `Due in ${diff} days`;
  let urgencyColor: AppColorRole = 'primary';
  let urgencyBg: AppColorRole = 'primarySoft';

  if (diff === 0) {
    urgencyLabel = 'Due Today';
    urgencyColor = 'warning';
    urgencyBg = 'warningSoft';
  } else if (diff < 0) {
    const overdueDays = -diff;
    urgencyLabel = `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`;
    urgencyColor = 'danger';
    urgencyBg = 'dangerSoft';
  }

  return (
    <View
      style={{
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: diff <= 0 ? theme.colors[urgencyColor] : theme.colors.border,
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors[urgencyColor] }} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.bold, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Next Due Installment
          </Text>
        </View>
        <View style={{ paddingVertical: 3, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors[urgencyBg] }}>
          <Text style={{ color: theme.colors[urgencyColor], fontSize: theme.typography.size.caption - 2, fontWeight: theme.typography.weight.bold }}>
            {urgencyLabel}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
            EMI #{nextDue.emiNumber}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            Due on {formatDate(nextDue.date)}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.heading, fontWeight: theme.typography.weight.bold }}>
            {formatINR(nextDue.amount)}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 2 }}>
            Scheduled cycle
          </Text>
        </View>
      </View>

      {showJump ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Jump to EMI ${nextDue.emiNumber} in list`}
          onPress={onJump}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 4,
            paddingVertical: 6,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primarySoft,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Icon name={direction === 'up' ? 'arrow-up' : 'arrow-down'} size={14} color="primary" />
          <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold }}>
            Jump to #{nextDue.emiNumber} in timeline
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const MonthHeader = React.memo(function MonthHeader({ row }: { row: Extract<Row, { kind: 'header' }> }) {
  const theme = useAppTheme();
  const right = row.isCurrent ? 'Current month' : row.unresolved ? 'Unresolved' : 'Cleared';
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
      const days = -dayDiff(item.dueDate, MOCK_TODAY);
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
          paddingLeft: isToday || isNextDue ? theme.spacing.lg : theme.spacing.md,
          gap: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          overflow: 'hidden',
          borderWidth: isNextDue ? 1 : 0,
          borderColor: isNextDue ? theme.colors.primary : 'transparent',
          minHeight: note ? CARD_WITH_NOTE_HEIGHT - theme.spacing.sm : CARD_STANDARD_HEIGHT - theme.spacing.sm,
        }}
      >
        {isToday || isNextDue ? (
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: theme.colors.primary }} />
        ) : null}

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
