/**
 * ScreenContainer — themed page wrapper with correct safe-area spacing on iOS, Android
 * (edge-to-edge) and web.
 * Supports an optional sticky `header` that remains pinned at the top while content scrolls beneath.
 */
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-theme';

export interface ScreenContainerProps {
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** 'canvas' uses the lavender page tint used by the entry / auth screens. */
  tone?: 'background' | 'canvas';
  /** Add the bottom safe-area inset. Set false on screens shown above the tab bar. */
  bottomInset?: boolean;
}

export function ScreenContainer({
  children,
  header,
  scroll = true,
  contentStyle,
  tone = 'background',
  bottomInset = true,
}: ScreenContainerProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const scrollPadding = {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: header ? theme.spacing.sm : insets.top + theme.spacing.sm,
    paddingBottom: (bottomInset ? insets.bottom : 0) + theme.spacing.xl,
    gap: theme.spacing.lg,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors[tone] }}
    >
      {header ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: insets.top + theme.spacing.sm,
            paddingBottom: theme.spacing.md,
            backgroundColor: theme.colors[tone],
            zIndex: 10,
          }}
        >
          {header}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[scrollPadding, { flexGrow: 1 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, scrollPadding, contentStyle]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}
