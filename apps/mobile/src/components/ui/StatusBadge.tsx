/**
 * StatusBadge — colour + text + icon for an installment/loan status (PRD 6.4, F-07).
 * ALWAYS pairs colour with a text label (never colour alone) for accessibility.
 */
import { Text, View } from 'react-native';

import { StatusColorRole, type StatusColorRoleKey } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

/** Loan-level status also supported for the loan cards. */
export type BadgeStatus = StatusColorRoleKey | 'ACTIVE' | 'CLOSED';

const LABEL: Record<BadgeStatus, string> = {
  PAID: 'Paid',
  PARTIAL: 'Partial',
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due today',
  UPCOMING: 'Upcoming',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
};

// Simple text glyphs stand in for icons in the prototype (TODO: real icons).
const ICON: Record<BadgeStatus, string> = {
  PAID: '\u2713', // check
  PARTIAL: '\u25D1', // half circle
  OVERDUE: '\u26A0', // warning
  DUE_TODAY: '\u25CF', // dot
  UPCOMING: '\u25CB', // open circle
  ACTIVE: '\u25CF',
  CLOSED: '\u2713',
};

function roleFor(status: BadgeStatus) {
  if (status === 'ACTIVE') return 'info' as const;
  if (status === 'CLOSED') return 'success' as const;
  return StatusColorRole[status];
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const theme = useAppTheme();
  const color = theme.colors[roleFor(status)];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        alignSelf: 'flex-start',
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ color, fontSize: theme.typography.size.caption }}>{ICON[status]}</Text>
      <Text
        style={{
          color,
          fontSize: theme.typography.size.caption,
          fontWeight: theme.typography.weight.semibold as '600',
        }}
      >
        {LABEL[status]}
      </Text>
    </View>
  );
}
