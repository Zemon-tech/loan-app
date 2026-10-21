/**
 * Toggle — 48 x 28 switch with a check mark in the thumb when on.
 * Smooth Reanimated spring translation and color interpolation on the UI thread.
 * Selection haptics on change; complies with useReducedMotion().
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-theme';

import { Icon } from './Icon';

export interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function Toggle({ value, onValueChange, accessibilityLabel, disabled }: ToggleProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();

  // 48 width - 4 padding - 24 thumb width = 20 travel distance
  const translateX = useSharedValue(value ? 20 : 0);
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      translateX.value = value ? 20 : 0;
      progress.value = value ? 1 : 0;
    } else {
      translateX.value = withSpring(value ? 20 : 0, theme.motion.spring.snappy);
      progress.value = withTiming(value ? 1 : 0, { duration: theme.motion.duration.fast });
    }
  }, [value, reduceMotion, theme, progress, translateX]);

  const trackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.border, theme.colors.primary],
    );
    return { backgroundColor };
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.5 + progress.value * 0.5 }],
  }));

  function handlePress() {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => {});
    onValueChange(!value);
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.track,
          trackStyle,
          { opacity: disabled ? 0.5 : 1 },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: theme.colors.card },
            thumbStyle,
          ]}
        >
          <Animated.View style={iconStyle}>
            <Icon name="checkmark" size={14} color="primary" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    padding: 2,
    borderRadius: 14,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
