/**
 * ScreenContainer — themed page wrapper with correct safe-area spacing on iOS, Android
 * (edge-to-edge) and web.
 * Supports an optional sticky `header` that remains pinned at the top while content scrolls beneath.
 *
 * Keyboard: Expo apps are edge-to-edge on Android, so the window does NOT resize for the soft
 * keyboard and a KeyboardAvoidingView without a `behavior` leaves inputs under it. `padding` is
 * set on every platform; it pads by the actual overlap between this view and the keyboard, so it
 * is safe if the window does resize (no double offset) and when the view sits above a tab bar.
 * (Do not set android `softwareKeyboardLayoutMode: pan` together with this.)
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
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
  /**
   * Form screens: when the keyboard opens, scroll to the bottom so the focused field and the
   * primary button stay visible above it (also covers hidden inputs the OS cannot auto-scroll to).
   */
  scrollToEndOnKeyboard?: boolean;
}

export function ScreenContainer({
  children,
  header,
  scroll = true,
  contentStyle,
  tone = 'background',
  bottomInset = true,
  scrollToEndOnKeyboard = false,
}: ScreenContainerProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!scrollToEndOnKeyboard || !scroll) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      // Wait one frame so KeyboardAvoidingView has applied its padding first.
      timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [scrollToEndOnKeyboard, scroll]);

  const scrollPadding = {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: header ? theme.spacing.sm : insets.top + theme.spacing.sm,
    paddingBottom: (bottomInset ? insets.bottom : 0) + theme.spacing.xl,
    gap: theme.spacing.lg,
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
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
          ref={scrollRef}
          contentContainerStyle={[scrollPadding, { flexGrow: 1 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
