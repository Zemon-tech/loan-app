/**
 * i18n setup (react-i18next). English is the source (`en.ts`); `hi.ts` is typed against it.
 * First launch follows the phone's language (Hindi if the phone is set to Hindi, otherwise
 * English); the user's saved choice (see features/settings/preferences.tsx) overrides it.
 * Strings missing in a language fall back to English. Plurals are avoided on purpose (separate
 * `...One` / `...Many` keys) so nothing depends on `Intl.PluralRules` being present in Hermes.
 */
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './en';
import { hi } from './hi';

export type Language = 'en' | 'hi';
export const LANGUAGES: readonly Language[] = ['en', 'hi'];

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'hi';
}

/** The phone's language, limited to what the app supports. Never throws. */
export function deviceLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React Native does not need HTML escaping
  returnNull: false,
  initAsync: false, // resources are bundled, so t() works immediately
  react: { useSuspense: false },
});

export default i18n;