/**
 * Icon — themed Ionicons wrapper. Colour is a semantic role, never a hex.
 * Icons are decorative by default (hidden from screen readers); always pair with text.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: AppColorRole;
}

export function Icon({ name, size = 20, color = 'textPrimary' }: IconProps) {
  const theme = useAppTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={theme.colors[color]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
