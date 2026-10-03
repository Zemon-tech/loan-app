/**
 * StateView — one layout for empty / error / informational states:
 * icon with optional corner badge, title, message, up to two actions, optional extra content.
 * Friendly copy only: never show status codes, stack traces or internal messages here.
 */
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Button } from './Button';
import type { IconName } from './Icon';
import { IconTile } from './IconTile';

export interface StateAction {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
}

export interface StateViewProps {
  icon: IconName;
  badge?: IconName;
  /** Tint of the icon tile. */
  tone?: 'neutral' | 'danger' | 'success';
  title: string;
  message: ReactNode;
  primary?: StateAction;
  secondary?: StateAction;
  children?: ReactNode;
}

const TONES: Record<NonNullable<StateViewProps['tone']>, { bg: AppColorRole; fg: AppColorRole }> = {
  neutral: { bg: 'primarySoft', fg: 'primary' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
  success: { bg: 'successSoft', fg: 'success' },
};

export function StateView({
  icon,
  badge,
  tone = 'neutral',
  title,
  message,
  primary,
  secondary,
  children,
}: StateViewProps) {
  const theme = useAppTheme();
  const t = TONES[tone];

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}>
      <View
        style={{
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: theme.colors[t.bg],
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 1,
        }}
      >
        <IconTile name={icon} size={64} background="card" color={t.fg} badge={badge} badgeColor={t.fg} />
      </View>

      <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontWeight: theme.typography.weight.bold,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.body,
            lineHeight: 24,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      </View>

      {children}

      {primary || secondary ? (
        <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm }}>
          {primary ? (
            <Button label={primary.label} leftIcon={primary.icon} loading={primary.loading} onPress={primary.onPress} />
          ) : null}
          {secondary ? (
            <Button label={secondary.label} variant="secondary" leftIcon={secondary.icon} onPress={secondary.onPress} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Scrollable page for a state inside a screen that has its own header (workspace, history...). */
export function StateScroll({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: insets.bottom + theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
    >
      {children}
    </ScrollView>
  );
}
