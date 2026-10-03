/**
 * S7: Repayment Schedule — PRD 8.7.
 * Context bar ("Next due EMI #96" + jump), summary tiles, All | Paid | Pending | Overdue filters,
 * month-grouped list with sticky headers, auto-scroll to the next due EMI.
 *
 * TODO (M-07):
 *  - GET /v1/loans/{loanId}/schedule; swap FlatList for FlashList (~600 rows)
 *  - loading / error / empty states; derive schedule via @app/shared computeSchedule; i18n
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type Filter = 'all' | 'paid' | 'pending' | 'overdue';

const MATCH: Record<Filter, (s: InstallmentStatus) => boolean> = {
  all: () => true,
  paid: (s) => s === 'PAID',
  pending: (s) => s === 'DUE_TODAY' || s === 'UPCOMING',
  overdue: (s) => s === 'OVERDUE' || s === 'PARTIAL',
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

  const [filter, setFilter] = useState<Filter>('all');
  const [direction, setDirection] = useState<'up' | 'down' | 'here'>('here');
  const listRef = useRef<FlatList<Row>>(null);
  const targetRef = useRef(-1);

  const counts = useMemo(() => {
    const c = { all: schedule.length, paid: 0, partial: 0, overdue: 0, pending: 0 };
    for (const i of schedule) {
      if (i.status === 'PAID') c.paid++;
      else if (i.status === 'PARTIAL') c.partial++;
      else if (i.status === 'OVERDUE') c.overdue++;
      else c.pending++; // due today + upcoming
    }
    return c;
  }, [schedule]);

  const nextDueNumber = loan.nextDue?.emiNumber;

  const { rows, targetIndex, headerIndices } = useMemo(() => {
    const out: Row[] = [];
    const headers: number[] = [];
    const visible = schedule.filter((i) => MATCH[filter](i.status));
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
          key: `h${k}`,
          title: formatMonthYear(item.dueDate),
          count: 0,
          isCurrent: k === thisMonth,
          unresolved: false,
        };
        out.push(header);
      }
      header.count += 1;
      if (item.status === 'OVERDUE' || item.status === 'PARTIAL') header.unresolved = true;
      out.push({ kind: 'item', key: `i${item.emiNumber}`, item });
    }
    const idx = out.findIndex((r) => r.kind === 'item' && r.item.emiNumber === nextDueNumber);
    return { rows: out, targetIndex: idx, headerIndices: headers };
  }, [schedule, filter, nextDueNumber]);

  useEffect(() => {
    targetRef.current = targetIndex;
  }, [targetIndex]);

  const scrollToTarget = useCallback(
    (animated: boolean) => {
      if (targetIndex < 0) return;
      listRef.current?.scrollToIndex({ index: targetIndex, viewPosition: 0.2, animated });
    },
    [targetIndex],
  );

  // On open (and when the filter changes): show the next due EMI, or the top of the list.
  useEffect(() => {
    const id = setTimeout(() => {
      if (filter === 'all' && targetIndex >= 0) scrollToTarget(false);
      else listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 80);
    return () => clearTimeout(id);
  }, [filter, targetIndex, scrollToTarget]);

  // Must stay referentially stable: FlatList does not support swapping this handler.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const target = targetRef.current;
    const indices = viewableItems.map((v) => v.index ?? -1).filter((i) => i >= 0);
    if (target < 0 || indices.length === 0) return;
    if (indices.includes(target)) return setDirection('here');
    setDirection(target < Math.min(...indices) ? 'up' : 'down');
  }, []);

  const tiles: { label: string; count: number; unit: string; fg: AppColorRole; bg: AppColorRole }[] = [
    { label: 'Paid', count: counts.paid, unit: 'EMIs', fg: 'success', bg: 'successSoft' },
    { label: 'Partial', count: counts.partial, unit: counts.partial === 1 ? 'EMI' : 'EMIs', fg: 'warning', bg: 'warningSoft' },
    { label: 'Overdue', count: counts.overdue, unit: 'EMIs', fg: 'danger', bg: 'dangerSoft' },
    { label: 'Upcoming', count: counts.pending, unit: 'EMIs', fg: 'textPrimary', bg: 'primarySoft' },
  ];

  const filters: { key: Filter; label: string; count: number; dot?: AppColorRole }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'paid', label: 'Paid', count: counts.paid, dot: 'success' },
    { key: 'pending', label: 'Pending', count: counts.pending, dot: 'primary' },
    { key: 'overdue', label: 'Overdue', count: counts.overdue + counts.partial, dot: 'danger' },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Context bar: where the next due EMI is, and a way to get there */}
      {loan.nextDue ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.sm,
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
            padding: theme.spacing.sm,
            paddingLeft: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }} />
            <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              Context:{' '}
              <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.weight.semibold }}>
                Next due EMI #{loan.nextDue.emiNumber}
              </Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Jump to next due installment, EMI ${loan.nextDue.emiNumber}`}
            onPress={() => scrollToTarget(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 36,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.85 : direction === 'here' ? 0.6 : 1,
            })}
          >
            <Icon
              name={direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'locate-outline'}
              size={16}
              color="onPrimary"
            />
            <Text style={{ color: theme.colors.onPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold }}>
              Jump to #{loan.nextDue.emiNumber}
            </Text>
          </Pressable>
        </View>
      ) : null}

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

      {/* Filters */}
      <View style={{ paddingVertical: theme.spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
          {filters.map((f) => {
            const selected = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(f.key)}
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

      {/* List */}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        stickyHeaderIndices={headerIndices}
        initialNumToRender={120}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => scrollToTarget(false), 100);
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
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <MonthHeader row={item} />
          ) : (
            <InstallmentCard item={item.item} />
          )
        }
      />
    </View>
  );
}

function MonthHeader({ row }: { row: Extract<Row, { kind: 'header' }> }) {
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
        paddingVertical: theme.spacing.sm,
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
}

function InstallmentCard({ item }: { item: Installment }) {
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
        paddingLeft: isToday ? theme.spacing.lg : theme.spacing.md,
        gap: theme.spacing.sm,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        overflow: 'hidden',
      }}
    >
      {isToday ? (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: theme.colors.primary }} />
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: isToday ? theme.typography.size.subtitle : theme.typography.size.body,
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
              fontSize: isToday ? theme.typography.size.heading : theme.typography.size.body,
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
}
