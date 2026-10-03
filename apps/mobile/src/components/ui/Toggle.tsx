/**
 * Toggle — 48 x 28 switch with a check mark in the thumb when on.
 * Same semantics as a native switch (role, checked state), consistent on iOS, Android and web.
 */
import { Pressable, View } from 'react-native';

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

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      onPress={() => onValueChange(!value)}
      style={{
        width: 48,
        height: 28,
        padding: 2,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
        backgroundColor: value ? theme.colors.primary : theme.colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: theme.colors.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value ? <Icon name="checkmark" size={14} color="primary" /> : null}
      </View>
    </Pressable>
  );
}
