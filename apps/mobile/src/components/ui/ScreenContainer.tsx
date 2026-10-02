/**
 * ScreenContainer — safe-area + scrollable page wrapper with themed background (PRD F-07).
 * Most screens render inside this. Pass `scroll={false}` for non-scrolling screens.
 */
import {
  SafeAreaView,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({ children, scroll = true, contentStyle }: ScreenContainerProps) {
  const theme = useAppTheme();

  const padding = { padding: theme.spacing.lg, gap: theme.spacing.lg };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
