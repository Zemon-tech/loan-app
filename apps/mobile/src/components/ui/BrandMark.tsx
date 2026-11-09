/**
 * BrandMark — the ALANG CREDITS logo (assets/images/logo.png) in a rounded tile.
 * `verified` adds the small green status dot used on splash / login.
 */
import { Image, View } from 'react-native';

import { COMPANY_SHORT_NAME } from '@/constants/brand';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon } from './Icon';

export interface BrandMarkProps {
  size?: number;
  verified?: boolean;
}

const logo = require('../../../assets/images/logo.png');

export function BrandMark({ size = 56, verified = false }: BrandMarkProps) {
  const theme = useAppTheme();
  const dot = Math.round(size * 0.3);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${COMPANY_SHORT_NAME} logo`}
      style={{ width: size, height: size }}
    >
      <Image
        source={logo}
        resizeMode="cover"
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}
      />
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
