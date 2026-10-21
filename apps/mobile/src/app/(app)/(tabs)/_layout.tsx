import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-theme';

function TabIcon({
  focused,
  focusedName,
  unfocusedName,
  color,
  size,
}: {
  focused: boolean;
  focusedName: keyof typeof Ionicons.glyphMap;
  unfocusedName: keyof typeof Ionicons.glyphMap;
  color: any;
  size: number;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withTiming(focused ? 1.08 : 1, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [focused, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={focused ? focusedName : unfocusedName}
        size={size}
        color={color}
      />
    </Animated.View>
  );
}

/**
 * Main Tabs navigator for the two primary destinations: Home (loans) and Profile (account).
 */
export default function TabsLayout() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: { fontSize: theme.typography.size.caption, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 60 + insets.bottom,
          paddingTop: theme.spacing.sm,
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
        },
      }}
    >
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              focusedName="wallet"
              unfocusedName="wallet-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              focusedName="person"
              unfocusedName="person-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
