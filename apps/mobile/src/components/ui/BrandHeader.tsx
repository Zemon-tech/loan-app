/**
 * BrandHeader — compact top bar for auth screens: optional back button,
 * brand mark and title. Used instead of a native header so the entry journey
 * looks the same on every platform.
 */
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

import { BrandMark } from './BrandMark';
import { Icon } from './Icon';

export interface BrandHeaderProps {
  title: string;
  /** Show a back button (defaults to router.back). */
  showBack?: boolean;
  onBack?: () => void;
}

/** Go back if there is history; otherwise (e.g. web refresh on this route) go to Login. */
export function goBackOrLogin() {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}

export function BrandHeader({ title, showBack = false, onBack }: BrandHeaderProps) {
  const theme = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={onBack ?? goBackOrLogin}
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
      ) : null}
      <BrandMark size={36} />
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
