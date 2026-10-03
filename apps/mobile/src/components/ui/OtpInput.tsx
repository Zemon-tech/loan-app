/**
 * OtpInput — six-cell one-time-code input (PRD F-07).
 * A single invisible TextInput receives all typing, paste and SMS autofill
 * (textContentType="oneTimeCode" / autoComplete="sms-otp"; no READ_SMS permission),
 * while the cells only render the value.
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  function handleChange(text: string) {
    const next = text.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  }

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={{ height: 56 }}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, height: 56 }} pointerEvents="none">
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
      </View>

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
