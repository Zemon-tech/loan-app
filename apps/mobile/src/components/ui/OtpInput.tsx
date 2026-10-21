/**
 * OtpInput — six-cell one-time-code input (PRD F-07).
 * Features subtle cell pop animations on digit entry, error shake animation,
 * and selection haptics.
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-theme';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  hasError?: boolean;
  /** Read-only (e.g. verification locked). */
  disabled?: boolean;
  onComplete?: (value: string) => void;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  hasError = false,
  disabled = false,
  onComplete,
}: OtpInputProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  const shakeOffset = useSharedValue(0);

  useEffect(() => {
    if (hasError && !reduceMotion) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      shakeOffset.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-3, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [hasError, reduceMotion, shakeOffset]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  function handleChange(text: string) {
    const next = text.replace(/\D/g, '').slice(0, length);
    if (next.length > value.length) {
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(next);
    if (next.length === length) onComplete?.(next);
  }

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={{ height: 56 }}
    >
      <Animated.View
        style={[
          { flexDirection: 'row', gap: theme.spacing.sm, height: 56 },
          shakeStyle,
        ]}
        pointerEvents="none"
      >
        {Array.from({ length }).map((_, i) => {
          const char = value[i];
          const isActive = focused && i === activeIndex;
          const borderColor = hasError
            ? theme.colors.danger
            : isActive
              ? theme.colors.primary
              : 'transparent';

          return (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.lg,
                borderWidth: 1.5,
                borderColor,
                backgroundColor: char || isActive ? theme.colors.card : theme.colors.primarySoft,
              }}
            >
              {char ? (
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.title,
                    fontWeight: theme.typography.weight.semibold,
                  }}
                >
                  {char}
                </Text>
              ) : isActive ? (
                <View style={{ width: 2, height: 24, backgroundColor: theme.colors.primary }} />
              ) : (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.colors.textSecondary,
                    opacity: 0.5,
                  }}
                />
              )}
            </View>
          );
        })}
      </Animated.View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus && !disabled}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        selectionColor="transparent"
        accessibilityLabel={`One-time code, ${length} digits`}
        style={[StyleSheet.absoluteFill, { opacity: 0.02, color: 'transparent' }]}
      />
    </Pressable>
  );
}
