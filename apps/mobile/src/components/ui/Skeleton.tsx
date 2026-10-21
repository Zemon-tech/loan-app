/**
 * Skeleton + SkeletonGroup — calm loading placeholders that mirror the final layout.
 * Driven by Reanimated 4 UI-thread worklets with smooth repeat animation.
 * Respects OS reduce motion setting and accessibility guidelines.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-theme';

const PulseContext = createContext<SharedValue<number> | null>(null);

export function SkeletonGroup({
  children,
  label = 'Loading',
  style,
}: {
  children: ReactNode;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(reduceMotion ? 0.7 : 0.45);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.7;
    } else {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.92, { duration: 750, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    }
  }, [reduceMotion, pulse]);

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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse ? pulse.value : 0.65,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
