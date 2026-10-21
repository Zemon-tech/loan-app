/**
 * SegmentedControl — equal-width tabs in a soft track (Overview | Schedule | History).
 * Features a smoothly sliding indicator pill driven by Reanimated spring physics
 * and tactile selection haptic feedback.
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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
  const reduceMotion = useReducedMotion();
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = options.findIndex((o) => o.key === value);
  const selectedIndex = activeIndex >= 0 ? activeIndex : 0;
  const numOptions = options.length;

  // Track padding is 4 on left and right
  const trackPadding = 4;
  const availableWidth = Math.max(0, containerWidth - trackPadding * 2);
  const segmentWidth = numOptions > 0 ? availableWidth / numOptions : 0;

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = selectedIndex * segmentWidth;
    if (reduceMotion) {
      translateX.value = target;
    } else {
      translateX.value = withSpring(target, theme.motion.spring.snappy);
    }
  }, [selectedIndex, segmentWidth, reduceMotion, theme, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
  }));

  function handleLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  }

  function handleSelect(key: K) {
    if (key === value) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(key);
  }

  return (
    <View
      accessibilityRole="tablist"
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          padding: trackPadding,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primarySoft,
        },
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              left: trackPadding,
              top: trackPadding,
              bottom: trackPadding,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.card,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 2,
            },
            indicatorStyle,
          ]}
        />
      ) : null}

      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => handleSelect(o.key)}
            style={styles.tab}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
