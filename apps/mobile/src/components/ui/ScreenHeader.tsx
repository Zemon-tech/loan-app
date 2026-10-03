/**
 * ScreenHeader — back button + title for secondary screens (Settings, Help, Legal, ...).
 * Falls back to `fallbackHref` when there is no history (deep link / web refresh).
 */
import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

import { Icon } from './Icon';

export interface ScreenHeaderProps {
  title: string;
  fallbackHref?: Href;
  /** Replace the default back behaviour. */
  onBack?: () => void;
}

export function ScreenHeader({ title, fallbackHref = '/account', onBack }: ScreenHeaderProps) {
  const theme = useAppTheme();

  function back() {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        onPress={back}
        style={({ pressed }) => ({
          width: theme.touchTarget.min,
          height: theme.touchTarget.min,
          marginLeft: -theme.spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon name="chevron-back" size={26} color="textPrimary" />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.subtitle,
          fontWeight: theme.typography.weight.semibold,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
