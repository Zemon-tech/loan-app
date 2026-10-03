/**
 * ScreenContainer — themed page wrapper with correct safe-area spacing on iOS, Android
 * (edge-to-edge) and web. Most screens render inside this.
 *
 * Spacing rules:
 *  - top: status bar / notch inset + a small gap, so headers never touch the system bar
 *  - bottom: home-indicator inset + a comfortable gap. Screens that sit ABOVE the tab bar pass
 *    `bottomInset={false}`: the tab bar already owns that inset, so only the gap is added.
 *  - sides: 16 (spacing.lg), with 16 between blocks
 *
 * Pass `scroll={false}` for non-scrolling screens.
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
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** 'canvas' uses the lavender page tint used by the entry / auth screens. */
  tone?: 'background' | 'canvas';
  /** Add the bottom safe-area inset. Set false on screens shown above the tab bar. */
  bottomInset?: boolean;
}

export function ScreenContainer({
  children,
  scroll = true,
  contentStyle,
  tone = 'background',
  bottomInset = true,
}: ScreenContainerProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: insets.top + theme.spacing.sm,
    paddingBottom: (bottomInset ? insets.bottom : 0) + theme.spacing.xl,
    gap: theme.spacing.lg,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors[tone] }}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, { flexGrow: 1 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}
