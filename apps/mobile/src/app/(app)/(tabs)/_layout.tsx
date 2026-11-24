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

import { FloatingTabBar } from '@/components/ui/FloatingTabBar';

// Profile tab is backed by the live /api/v1/me endpoint.
const SHOW_PROFILE_TAB = true;

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

  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
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
          // Hidden in live mode (no profile endpoint) — code retained for mock mode.
          href: SHOW_PROFILE_TAB ? undefined : null,
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
