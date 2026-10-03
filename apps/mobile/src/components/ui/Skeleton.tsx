/**
 * Skeleton + SkeletonGroup — calm loading placeholders that mirror the final layout.
 * One shared pulse drives every bar in a group. Respects the OS "reduce motion" setting.
 * The group is announced once as "Loading" instead of every bar being read out.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

const PulseContext = createContext<Animated.Value | null>(null);

export function SkeletonGroup({
  children,
  label = 'Loading',
  style,
}: {
  children: ReactNode;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const useNativeDriver = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <PulseContext.Provider value={reduceMotion ? null : pulse}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion="polite"
        style={style}
      >
        {children}
      </View>
    </PulseContext.Provider>
  );
}

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const theme = useAppTheme();
  const pulse = useContext(PulseContext);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.border,
          opacity: pulse ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }) : 0.7,
        },
        style,
      ]}
    />
  );
}
