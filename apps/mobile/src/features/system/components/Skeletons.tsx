/**
 * Skeleton versions of Home, Loan Overview and History.
 * Each mirrors the real screen's structure (same cards, rows and spacing) so nothing jumps
 * when data arrives.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Skeleton, SkeletonGroup } from '@/components/ui';
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

export function HomeSkeleton() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  return (
    <SkeletonGroup label={t('skeleton.loans')} style={{ gap: theme.spacing.lg }}>
      {/* greeting line, page title, count chips, then the loans table */}
      <Skeleton width={190} height={20} />
      <View style={{ gap: theme.golden.spacing.f1 }}>
        <Skeleton width={150} height={26} />
        <Row gap={8}>
          <Skeleton width={100} height={40} radius={theme.radius.pill} />
          <Skeleton width={116} height={40} radius={theme.radius.pill} />
        </Row>
      </View>
      <SkCard>
        {[0, 1, 2].map((i) => (
          <Row key={i} gap={12}>
            <View style={{ flex: 1.4, gap: 7 }}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="55%" height={12} />
              <Skeleton width="65%" height={12} />
            </View>
            <View style={{ flex: 0.9 }}>
              <Skeleton width="80%" height={16} />
            </View>
            <View style={{ flex: 1.2, gap: 7 }}>
              <Skeleton width="85%" height={16} />
              <Skeleton width="60%" height={16} />
            </View>
          </Row>
        ))}
      </SkCard>
    </SkeletonGroup>
  );
}

/* ---------------------------- Loan overview ---------------------------- */

export function OverviewSkeleton() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      scrollEnabled={false}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xl }}
    >
      <SkeletonGroup label={t('skeleton.loanDetails')} style={{ gap: theme.spacing.lg }}>
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

        <Row gap={12}>
          {[0, 1].map((i) => (
            <View key={i} style={{ flex: 1 }}>
              <SkCard>
                <Row>
                  <Skeleton width={36} height={36} radius={11} />
                  <Skeleton width={70} height={11} />
                </Row>
                <Skeleton width={100} height={20} />
              </SkCard>
            </View>
          ))}
        </Row>
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

/* ------------------------------- History ------------------------------- */

export function HistorySkeleton() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  return (
    <SkeletonGroup label={t('skeleton.transactions')} style={{ flex: 1, gap: theme.spacing.md }}>
      <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
        <Skeleton width={110} height={20} />
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
