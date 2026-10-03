/**
 * BrandMark — the Loan Tracker app mark (rounded blue tile with a ledger glyph).
 * `verified` adds the small green status dot used on splash / login.
 */
import { View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

import { Icon } from './Icon';

export interface BrandMarkProps {
  size?: number;
  verified?: boolean;
}

export function BrandMark({ size = 56, verified = false }: BrandMarkProps) {
  const theme = useAppTheme();
  const dot = Math.round(size * 0.3);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Loan Tracker logo"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="document-text-outline" size={Math.round(size * 0.52)} color="onPrimary" />
      {verified ? (
        <View
          style={{
            position: 'absolute',
            right: -Math.round(size * 0.06),
            bottom: -Math.round(size * 0.06),
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: theme.colors.success,
            borderWidth: 2,
            borderColor: theme.colors.canvas,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="checkmark" size={Math.round(dot * 0.6)} color="onPrimary" />
        </View>
      ) : null}
    </View>
  );
}
