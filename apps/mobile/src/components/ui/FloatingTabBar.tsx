/**
 * FloatingTabBar — the app's bottom navigation: a white rounded bar floating above the page
 * canvas, with the active tab shown as a soft yellow pill (icon above label). Passed to the
 * Expo Router `Tabs` as `tabBar`; icons and labels come from each screen's options.
 */
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICON_SIZE = 24;

export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        // Full width, flush with the bottom and both sides. The bottom inset is padding INSIDE the
        // bar, so the white background extends under the system navigation bar.
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingBottom: insets.bottom + theme.spacing.sm,
      }}
    >
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: theme.spacing.sm }}>        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          // Screens hidden with `href: null` get display: none from Expo Router.
          if ((options.tabBarItemStyle as { display?: string } | undefined)?.display === 'none') {
            return null;
          }
          const focused = state.index === index;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const color = focused ? theme.colors.textPrimary : theme.colors.textSecondary;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 60,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                borderRadius: theme.radius.xl + 4,
                backgroundColor: focused ? `${theme.colors.primary}59` : 'transparent',
                opacity: pressed && !focused ? 0.6 : 1,
              })}
            >
              {options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
              <Text
                numberOfLines={1}
                style={{
                  color,
                  fontSize: theme.typography.size.caption,
                  fontWeight: focused ? theme.typography.weight.bold : theme.typography.weight.semibold,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
