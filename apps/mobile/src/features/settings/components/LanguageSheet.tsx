/**
 * LanguageSheet — pick English or Hindi. One tap selects and closes.
 *
 * TODO (Phase 2): wire into i18next; until translations ship, text stays in English.
 */
import { Text, View } from 'react-native';

import { BottomSheet, OptionRow } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

import { LANGUAGE_LABEL, usePreferences, type Language } from '../preferences';

const ORDER: Language[] = ['en', 'hi'];

export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const { language, setLanguage } = usePreferences();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Language">
      <View style={{ gap: theme.spacing.sm }} accessibilityRole="radiogroup">
        {ORDER.map((l) => (
          <OptionRow
            key={l}
            label={LANGUAGE_LABEL[l]}
            selected={language === l}
            onPress={() => {
              setLanguage(l);
              onClose();
            }}
          />
        ))}
      </View>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, textAlign: 'center' }}>
        App text switches to your language as translations become available.
      </Text>
    </BottomSheet>
  );
}
