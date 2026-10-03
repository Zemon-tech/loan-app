/**
 * IconTile — rounded square holding one icon, optionally with a small corner badge.
 * The "simple security icon" used on App Lock, Unlock, Update and Maintenance screens.
 */
import { View } from 'react-native';

import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './Icon';

export interface IconTileProps {
  name: IconName;
  size?: number;
  /** Tile background role. */
  background?: AppColorRole;
  /** Icon colour role. */
  color?: AppColorRole;
  /** Optional small badge icon in the bottom-right corner. */
  badge?: IconName;
  badgeBackground?: AppColorRole;
  badgeColor?: AppColorRole;
}

export function IconTile({
  name,
  size = 56,
  background = 'primarySoft',
  color = 'primary',
  badge,
  badgeBackground = 'card',
  badgeColor = 'primary',
}: IconTileProps) {
  const theme = useAppTheme();
  const badgeSize = Math.round(size * 0.36);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: theme.colors[background],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={Math.round(size * 0.5)} color={color} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            right: -Math.round(size * 0.08),
            bottom: -Math.round(size * 0.08),
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: theme.colors[badgeBackground],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={badge} size={Math.round(badgeSize * 0.58)} color={badgeColor} />
        </View>
      ) : null}
    </View>
  );
}
