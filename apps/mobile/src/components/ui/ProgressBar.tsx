/**
 * ProgressBar — thin determinate bar (e.g. "18 of 36 EMIs completed").
 * Features smooth UI-thread width animation using Reanimated worklets.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export interface ProgressBarProps {
  /** 0..1 */
  ratio: number;
  color?: AppColorRole;
  accessibilityLabel?: string;
}

export function ProgressBar({ ratio, color = 'primary', accessibilityLabel }: ProgressBarProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);

  const animatedPct = useSharedValue(reduceMotion ? pct : 0);

  useEffect(() => {
    if (reduceMotion) {
      animatedPct.value = pct;
    } else {
      animatedPct.value = withTiming(pct, {
        duration: theme.motion.duration.slow,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [pct, reduceMotion, theme, animatedPct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedPct.value}%`,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{
        height: 8,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.primarySoft,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: theme.colors[color],
            borderRadius: theme.radius.pill,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
