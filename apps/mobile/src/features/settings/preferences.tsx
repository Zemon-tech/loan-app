/**
 * User preferences. The language is applied to i18next at once and saved on the phone
 * (AsyncStorage) so it survives restarts; until a choice is saved the phone's language is used.
 * `notificationsEnabled` is still in-memory only (TODO Phase 2: push registration).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import i18n, { isLanguage, type Language } from '@/i18n';
import { logger } from '@/lib/logger';

export type { Language };

export const LANGUAGE_LABEL: Record<Language, string> = {
  en: 'English',
  hi: '\u0939\u093F\u0928\u094D\u0926\u0940',
};

const STORAGE_KEY = 'app.language';

interface PreferencesState {
  language: Language;
  setLanguage: (l: Language) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (on: boolean) => void;
}

const PreferencesContext = createContext<PreferencesState | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (isLanguage(i18n.language) ? i18n.language : 'en'));
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Apply a saved choice once on start. A read failure keeps the phone's language.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (cancelled || !isLanguage(saved)) return;
        void i18n.changeLanguage(saved);
        setLanguageState(saved);
      })
      .catch(() => logger.warn('settings', 'language_load_failed'));
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    if (!isLanguage(next)) return;
    void i18n.changeLanguage(next);
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => logger.warn('settings', 'language_save_failed'));
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, notificationsEnabled, setNotificationsEnabled }),
    [language, setLanguage, notificationsEnabled],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesState {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}