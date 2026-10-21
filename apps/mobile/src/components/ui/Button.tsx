/**
 * Button — token-based pressable (PRD F-07).
 * Variants: primary, secondary (outlined), danger, ghost (text only).
 * Optional leading / trailing icons.
 * Features fluid spring scale on press and haptic feedback.
 */
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const bg =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'danger'
        ? theme.colors.danger
        : variant === 'ghost'
          ? 'transparent'
          : theme.colors.card;
  const fgRole: AppColorRole =
    variant === 'secondary'
      ? 'textPrimary'
      : variant === 'ghost'
        ? 'textSecondary'
        : 'onPrimary';
  const fg = theme.colors[fgRole];
  const outlined = variant === 'secondary';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (disabled || loading || reduceMotion) return;
    scale.value = withSpring(0.96, theme.motion.spring.snappy);
  }

  function handlePressOut() {
    if (disabled || loading) return;
    scale.value = withSpring(1, theme.motion.spring.snappy);
  }

  function handlePress() {
    if (disabled || loading) return;
    if (variant === 'primary' || variant === 'danger') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  }

  return (
    <Animated.View style={[{ width: '100%' }, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: bg,
            borderColor: outlined ? theme.colors.border : 'transparent',
            borderWidth: outlined ? StyleSheet.hairlineWidth : 0,
            minHeight: variant === 'ghost' ? theme.touchTarget.min : 52,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing.lg,
            opacity: disabled ? 0.5 : pressed && variant === 'ghost' ? 0.7 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.content}>
            {leftIcon ? <Icon name={leftIcon} size={20} color={fgRole} /> : null}
            <Text
              style={{
                color: fg,
                fontSize: theme.typography.size.body,
                fontWeight: theme.typography.weight.semibold,
              }}
            >
              {label}
            </Text>
            {rightIcon ? <Icon name={rightIcon} size={20} color={fgRole} /> : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
