/**
 * SegmentedControl — equal-width tabs in a soft track (Overview | Schedule | History).
 */
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

export interface SegmentedControlProps<K extends string> {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<K>) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.primarySoft,
      }}
    >
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => !selected && onChange(o.key)}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
              backgroundColor: selected ? theme.colors.card : 'transparent',
            }}
          >
            <Text
              style={{
                color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
                fontSize: theme.typography.size.body,
                fontWeight: selected
                  ? theme.typography.weight.semibold
                  : theme.typography.weight.medium,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
