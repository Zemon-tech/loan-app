/**
 * PageTitle — the one page-title style for the main screens (Loans, Profile, ...): 26px bold on a
 * 32px line (golden heading, tight leading), with an optional supporting block under it. Using the
 * same component everywhere keeps size, weight and spacing identical from screen to screen.
 */
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

export interface PageTitleProps {
  title: string;
  /** Content shown directly under the title (e.g. count chips). */
  children?: ReactNode;
}

export function PageTitle({ title, children }: PageTitleProps) {
  const theme = useAppTheme();
  const g = theme.golden;
  return (
    <View style={{ gap: g.spacing.f1 }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textPrimary,
          fontSize: g.type.heading,
          lineHeight: g.lineHeight.heading,
          fontWeight: theme.typography.weight.bold,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}