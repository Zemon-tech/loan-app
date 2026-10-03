/**
 * Skeleton versions of Home, Loan Overview, Schedule and History.
 * Each mirrors the real screen's structure (same cards, rows and spacing) so nothing jumps
 * when data arrives.
 */
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, Card, Skeleton, SkeletonGroup } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

function SkCard({ children, gap }: { children: ReactNode; gap?: number }) {
  const theme = useAppTheme();
  return (
    <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: gap ?? theme.spacing.md }}>
      {children}
    </Card>
  );
}

function Row({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>{children}</View>;
}

/* ------------------------------- Home ------------------------------- */

function LoanCardSkeleton() {
  const theme = useAppTheme();
  return (
    <SkCard>
      <Row>
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={80} height={11} />
          <Skeleton width={110} height={18} />
          <Skeleton width={130} height={14} />
        </View>
        <Skeleton width={84} height={26} radius={theme.radius.pill} />
      </Row>
      <View style={{ gap: 10 }}>
        <Row>
          <Skeleton width={80} height={12} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Skeleton width={120} height={24} />
          </View>
        </Row>
        <Skeleton height={8} radius={4} />
        <Skeleton width={140} height={11} />
      </View>
      <View style={{ padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}>
        <Row>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={60} height={11} />
            <Skeleton width={90} height={18} />
          </View>
          <Skeleton width={36} height={36} radius={18} />
        </Row>
      </View>
    </SkCard>
  );
}

export function HomeSkeleton() {
  const theme = useAppTheme();
  return (
    <SkeletonGroup label="Loading your loans" style={{ gap: theme.spacing.lg }}>
      <Row>
        <BrandMark size={36} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={190} height={20} />
          <Skeleton width={150} height={14} />
        </View>
        <Skeleton width={44} height={44} radius={22} />
      </Row>

      <SkCard>
        <Skeleton width={170} height={12} />
        <Skeleton width={210} height={36} radius={8} />
        <Row gap={8}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, gap: 8, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}>
              <Skeleton width="60%" height={11} />
              <Skeleton width="80%" height={16} />
              <Skeleton width="50%" height={11} />
            </View>
          ))}
        </Row>
        <Skeleton width={120} height={11} />
      </SkCard>

      <Skeleton width={110} height={20} />
      <LoanCardSkeleton />
      <LoanCardSkeleton />
    </SkeletonGroup>
  );
}

/* ---------------------------- Loan overview ---------------------------- */

export function OverviewSkeleton() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      scrollEnabled={false}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xl }}
    >
      <SkeletonGroup label="Loading loan details" style={{ gap: theme.spacing.lg }}>
        <SkCard>
          <Row>
            <Skeleton width={40} height={40} radius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={90} height={11} />
              <Skeleton width={150} height={16} />
            </View>
            <Skeleton width={84} height={26} radius={theme.radius.pill} />
          </Row>
          <View style={{ gap: 8 }}>
            <Skeleton width={190} height={11} />
            <Skeleton width={200} height={38} radius={8} />
          </View>
          <View style={{ gap: 8 }}>
            <Row>
              <Skeleton width={130} height={12} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Skeleton width={100} height={12} />
              </View>
            </Row>
            <Skeleton height={8} radius={4} />
          </View>
        </SkCard>

        <SkCard>
          <Row>
            <Skeleton width={40} height={40} radius={20} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width={130} height={11} />
              <Skeleton width={180} height={20} />
            </View>
          </Row>
        </SkCard>

        <SkCard>
          <Row>
            <Skeleton width={32} height={32} radius={10} />
            <Skeleton width={110} height={16} />
          </Row>
          {[0, 1, 2, 3].map((i) => (
            <Row key={i}>
              <Skeleton width={120} height={13} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Skeleton width={110} height={13} />
              </View>
            </Row>
          ))}
        </SkCard>

        <SkCard>
          <Skeleton width={190} height={16} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Row key={i}>
              <Skeleton width={150} height={13} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Skeleton width={70} height={13} />
              </View>
            </Row>
          ))}
          <View style={{ padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft, gap: 8 }}>
            <Skeleton width={160} height={11} />
            <Skeleton width={130} height={28} radius={8} />
          </View>
        </SkCard>
      </SkeletonGroup>
    </ScrollView>
  );
}

/* ------------------------------ Schedule ------------------------------ */

export function ScheduleSkeleton() {
  const theme = useAppTheme();
  return (
    <SkeletonGroup label="Loading repayment schedule" style={{ flex: 1, gap: theme.spacing.md }}>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Skeleton height={52} radius={theme.radius.lg} />
      </View>
      <Row gap={8}>
        <View style={{ width: theme.spacing.lg - 8 }} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <Skeleton height={68} radius={theme.radius.lg} />
          </View>
        ))}
        <View style={{ width: theme.spacing.lg - 8 }} />
      </Row>
      <Row gap={8}>
        <View style={{ width: theme.spacing.lg - 8 }} />
        {[64, 92, 92, 92].map((w, i) => (
          <Skeleton key={i} width={w} height={40} radius={theme.radius.pill} />
        ))}
      </Row>
      <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
        <Row>
          <Skeleton width={150} height={18} />
          <Skeleton width={90} height={20} radius={10} />
        </Row>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkCard key={i} gap={10}>
            <Row>
              <View style={{ flex: 1, gap: 8 }}>
                <Row>
                  <Skeleton width={70} height={16} />
                  <Skeleton width={76} height={22} radius={11} />
                </Row>
                <Skeleton width={110} height={11} />
              </View>
              <Skeleton width={64} height={18} />
            </Row>
            <Skeleton width="70%" height={11} />
          </SkCard>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/* ------------------------------- History ------------------------------- */

export function HistorySkeleton() {
  const theme = useAppTheme();
  return (
    <SkeletonGroup label="Loading transactions" style={{ flex: 1, gap: theme.spacing.md }}>
      <Row gap={8}>
        <View style={{ width: theme.spacing.lg - 8 }} />
        {[84, 84, 76, 92].map((w, i) => (
          <Skeleton key={i} width={w} height={40} radius={theme.radius.pill} />
        ))}
      </Row>
      <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
        <Row>
          <Skeleton width={150} height={18} />
          <Skeleton width={64} height={20} radius={10} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Skeleton width={90} height={12} />
          </View>
        </Row>
        <View style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.card, overflow: 'hidden' }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{ padding: theme.spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.border }}
            >
              <Row>
                <Skeleton width={40} height={40} radius={20} />
                <View style={{ flex: 1, gap: 7 }}>
                  <Skeleton width={110} height={15} />
                  <Skeleton width="80%" height={11} />
                  <Skeleton width={90} height={10} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 7 }}>
                  <Skeleton width={64} height={16} />
                  <Skeleton width={44} height={10} />
                </View>
              </Row>
            </View>
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}
