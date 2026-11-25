/**
 * LanguageToggle - small "English | हिन्दी" switch. Used on the Login screen (before sign-in) and
 * the language row on Profile uses the same preference. Each side is labelled in its own language,
 * so someone who cannot read the current language can still find theirs.
 */
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

import { LANGUAGE_LABEL, usePreferences, type Language } from '../preferences';

const ORDER: Language[] = ['en', 'hi'];

export function LanguageToggle() {
  const theme = useAppTheme();
  const { language, setLanguage } = usePreferences();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.mutedSurface,
      }}
    >
      {ORDER.map((l) => {
        const selected = l === language;
        return (
          <Pressable
            key={l}
            accessibilityRole="radio"
            accessibilityLabel={LANGUAGE_LABEL[l]}
            accessibilityState={{ selected }}
            onPress={() => setLanguage(l)}
            hitSlop={6}
            style={{
              minHeight: theme.touchTarget.min - 8,
              paddingHorizontal: theme.golden.spacing.f2,
              borderRadius: theme.radius.pill,
              justifyContent: 'center',
              backgroundColor: selected ? theme.colors.surface : 'transparent',
            }}
          >
            <Text
              style={{
                color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
                fontSize: theme.golden.type.caption + 1,
                fontWeight: selected ? theme.typography.weight.bold : theme.typography.weight.medium,
              }}
            >
              {LANGUAGE_LABEL[l]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}