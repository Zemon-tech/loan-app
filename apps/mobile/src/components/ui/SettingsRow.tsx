/**
 * SettingsGroup + SettingsRow — clean icon list rows used by Profile and Settings.
 * A row is a button when `onPress` is set; pass `right` for a switch or custom trailing content.
 */
import { Children, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { IconTile } from './IconTile';

export function SectionLabel({ children }: { children: string }) {
  const theme = useAppTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: theme.colors.textSecondary,
        fontSize: theme.typography.size.caption - 1,
        fontWeight: theme.typography.weight.semibold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        paddingHorizontal: theme.spacing.xs,
      }}
    >
      {children}
    </Text>
  );
}

/** Card that stacks rows with hairline dividers. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const items = Children.toArray(children);
  return (
    <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: 0, gap: 0, overflow: 'hidden' }}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? (
            <View style={{ height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.lg }} />
          ) : null}
          {child}
        </View>
      ))}
    </Card>
  );
}

export interface SettingsRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Short value shown before the chevron, e.g. "English". */
  value?: string;
  onPress?: () => void;
  /** Custom trailing content (e.g. a Switch). Disables the chevron. */
  right?: ReactNode;
  danger?: boolean;
  accessibilityHint?: string;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  right,
  danger,
  accessibilityHint,
}: SettingsRowProps) {
  const theme = useAppTheme();

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: 64,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <IconTile
        name={icon}
        size={36}
        background={danger ? 'dangerSoft' : 'primarySoft'}
        color={danger ? 'danger' : 'textPrimary'}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: danger ? theme.colors.danger : theme.colors.textPrimary,
            fontSize: theme.typography.size.body,
            fontWeight: theme.typography.weight.semibold,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 18 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>{value}</Text>
      ) : null}
      {right ??
        (onPress ? <Icon name="chevron-forward" size={20} color={danger ? 'danger' : 'textSecondary'} /> : null)}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}
