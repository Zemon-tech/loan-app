/**
 * LanguageSheet - pick English or Hindi. One tap selects, applies the language at once and closes.
 * Each option is written in its own language, so it can be found whatever language is active.
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet, OptionRow } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

import { LANGUAGE_LABEL, usePreferences, type Language } from '../preferences';

const ORDER: Language[] = ['en', 'hi'];

export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { language, setLanguage } = usePreferences();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('lang.title')}>
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
        {t('lang.note')}
      </Text>
    </BottomSheet>
  );
}