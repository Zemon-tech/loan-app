/**
 * In-memory user preferences for the PROTOTYPE.
 *
 * TODO (M-09 / Phase 2):
 *  - persist in AsyncStorage / SecureStore
 *  - wire `language` into i18next and `notificationsEnabled` into push registration
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'hi';

export const LANGUAGE_LABEL: Record<Language, string> = {
  en: 'English',
  hi: '\u0939\u093F\u0928\u094D\u0926\u0940',
};

/** How long the app may stay in the background before App Lock asks again. */
export const AUTO_LOCK_OPTIONS: { seconds: number; label: string; summary: string }[] = [
  { seconds: 0, label: 'Immediately', summary: 'Immediately after leaving app' },
  { seconds: 60, label: 'After 1 minute', summary: 'After 1 minute away' },
  { seconds: 300, label: 'After 5 minutes', summary: 'After 5 minutes away' },
];

interface PreferencesState {
  autoLockSeconds: number;
  setAutoLockSeconds: (s: number) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (on: boolean) => void;
}

const PreferencesContext = createContext<PreferencesState | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoLockSeconds, setAutoLockSeconds] = useState(0);

  const value = useMemo(
    () => ({ language, setLanguage, notificationsEnabled, setNotificationsEnabled, autoLockSeconds, setAutoLockSeconds }),
    [language, notificationsEnabled, autoLockSeconds],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesState {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
