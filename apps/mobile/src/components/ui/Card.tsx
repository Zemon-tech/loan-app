/**
 * Card — a surface container with padding + rounded corners (PRD F-07).
 */
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  /** 'surface' (default, grey) or 'card' (white / elevated-dark, for use on the canvas tint). */
  tone?: 'surface' | 'card';
}

export function Card({ style, tone = 'surface', children, ...rest }: CardProps) {
  const theme = useAppTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: tone === 'card' ? theme.colors.card : theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
