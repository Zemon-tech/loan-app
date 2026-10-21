import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-theme';

export interface PressableScaleProps {
  children: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  activeScale?: number;
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'radio' | 'checkbox';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: { disabled?: boolean; selected?: boolean; checked?: boolean };
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
}

export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  activeScale = 0.97,
  haptic = false,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop,
}: PressableScaleProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (disabled) return;
    if (reduceMotion) return;
    scale.value = withSpring(activeScale, theme.motion.spring.snappy);
  }

  function handlePressOut() {
    if (disabled) return;
    scale.value = withSpring(1, theme.motion.spring.snappy);
  }

  function handlePress(e: GestureResponderEvent) {
    if (disabled) return;
    if (haptic) {
      const style = typeof haptic === 'boolean' ? Haptics.ImpactFeedbackStyle.Light : haptic;
      Haptics.impactAsync(style).catch(() => {});
    }
    onPress?.(e);
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, ...accessibilityState }}
        disabled={disabled}
        hitSlop={hitSlop}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={onLongPress}
        style={{ width: '100%' }}
      >
        {typeof children === 'function' ? (state) => children(state) : children}
      </Pressable>
    </Animated.View>
  );
}
