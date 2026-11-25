/**
 * StatusBadge — colour + icon + TEXT for an installment/loan status (PRD 6.4, F-07).
 * ALWAYS pairs colour with a text label and an icon (never colour alone).
 */
import { useTranslation } from 'react-i18next';

import { StatusColorRole, type AppColorRole, type StatusColorRoleKey } from '@/constants/theme';

import type { IconName } from './Icon';
import { Pill } from './Pill';

/** Loan-level status also supported for the loan cards. */
export type BadgeStatus = StatusColorRoleKey | 'ACTIVE' | 'CLOSED';

/** i18n keys of the labels (shown with t(key)). */
const LABEL_KEY: Record<BadgeStatus, string> = {
  PAID: 'status.paid',
  PARTIAL: 'status.partial',
  OVERDUE: 'status.overdue',
  DUE_TODAY: 'status.dueToday',
  UPCOMING: 'status.upcoming',
  ACTIVE: 'status.active',
  CLOSED: 'status.closed',
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
  UPCOMING: 'mutedSurface',
  ACTIVE: 'secondarySoft',
  CLOSED: 'mutedSurface',
};

function roleFor(status: BadgeStatus): AppColorRole {
  if (status === 'ACTIVE') return 'secondary';
  if (status === 'CLOSED') return 'textSecondary';
  return StatusColorRole[status];
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const { t } = useTranslation();
  return (
    <Pill
      icon={ICON[status]}
      label={t(LABEL_KEY[status])}
      color={roleFor(status)}
      background={SOFT[status]}
      uppercase
    />
  );
}
