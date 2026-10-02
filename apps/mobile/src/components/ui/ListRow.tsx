/**
 * ListRow — a tappable label/value row, used for settings-style lists and detail rows (PRD F-07).
 * `onPress` optional: omit for static label/value rows, provide for navigation rows.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

export interface ListRowProps {
  label: string;
  value?: string;
  /** Show a chevron to hint navigation. Defaults to true when onPress is set. */
  showChevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
}

export function ListRow({ label, value, showChevron, onPress, danger }: ListRowProps) {
  const theme = useAppTheme();
  const chevron = showChevron ?? Boolean(onPress);
  const labelColor = danger ? theme.colors.danger : theme.colors.textPrimary;

  const content = (
    <View
      style={[
        styles.row,
        {
          minHeight: theme.touchTarget.min,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={{ color: labelColor, fontSize: theme.typography.size.body }}>{label}</Text>
      <View style={styles.right}>
        {value !== undefined ? (
          <Text
            style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}
          >
            {value}
          </Text>
        ) : null}
        {chevron ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
            {'\u203A'}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
