/**
 * StatusBadge — colour + icon + TEXT for an installment/loan status (PRD 6.4, F-07).
 * ALWAYS pairs colour with a text label and an icon (never colour alone).
 */
import { StatusColorRole, type AppColorRole, type StatusColorRoleKey } from '@/constants/theme';

import type { IconName } from './Icon';
import { Pill } from './Pill';

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

const ICON: Record<BadgeStatus, IconName> = {
  PAID: 'checkmark-circle',
  PARTIAL: 'contrast-outline',
  OVERDUE: 'warning',
  DUE_TODAY: 'time-outline',
  UPCOMING: 'ellipse-outline',
  ACTIVE: 'ellipse',
  CLOSED: 'checkmark-circle-outline',
};

const SOFT: Record<BadgeStatus, AppColorRole> = {
  PAID: 'successSoft',
  PARTIAL: 'warningSoft',
  OVERDUE: 'dangerSoft',
  DUE_TODAY: 'primarySoft',
  UPCOMING: 'surface',
  ACTIVE: 'primarySoft',
  CLOSED: 'successSoft',
};

function roleFor(status: BadgeStatus): AppColorRole {
  if (status === 'ACTIVE') return 'info';
  if (status === 'CLOSED') return 'success';
  return StatusColorRole[status];
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <Pill
      icon={ICON[status]}
      label={LABEL[status]}
      color={roleFor(status)}
      background={SOFT[status]}
      uppercase
    />
  );
}
