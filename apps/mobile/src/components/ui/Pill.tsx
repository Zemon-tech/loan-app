/**
 * Pill — small rounded label with an optional icon or status dot.
 * Used for trust cues ("256-bit Encrypted"), step indicators and release tags.
 */
import { Text, View } from 'react-native';

import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './Icon';

export interface PillProps {
  label: string;
  icon?: IconName;
  /** Show a filled status dot (colour role) before the label. */
  dot?: AppColorRole;
  /** Text / icon colour role. */
  color?: AppColorRole;
  /** Background colour role. */
  background?: AppColorRole;
  uppercase?: boolean;
}

export function Pill({
  label,
  icon,
  dot,
  color = 'textSecondary',
  background = 'primarySoft',
  uppercase = false,
}: PillProps) {
  const theme = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.spacing.sm - 2,
        paddingVertical: theme.spacing.xs + 2,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors[background],
      }}
    >
      {dot ? (
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors[dot] }}
        />
      ) : null}
      {icon ? <Icon name={icon} size={14} color={color} /> : null}
      <Text
        style={{
          color: theme.colors[color],
          fontSize: theme.typography.size.caption - 1,
          fontWeight: theme.typography.weight.semibold,
          letterSpacing: uppercase ? 0.6 : 0.1,
          textTransform: uppercase ? 'uppercase' : 'none',
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
