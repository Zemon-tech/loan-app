/**
 * Theme hook for the loan app. The app is LIGHT ONLY for now (docs/DECISIONS.md).
 * Dark tokens stay in `AppColors.dark`; a future in-app toggle only needs to change
 * `resolveScheme()` (e.g. read a stored preference) - no screen changes.
 * The UI language also feeds the tokens (Hindi gets taller line heights, no letter spacing), and
 * subscribing to it here re-renders every themed component when the language changes.
 */
import { useTranslation } from 'react-i18next';

import { getAppTheme, type AppColorScheme, type AppTheme } from '@/constants/theme';

/** Single place that decides the active colour scheme. */
export function resolveScheme(): AppColorScheme {
  return 'light';
}

/**
 * useAppTheme - returns the loan app's design-token theme (PRD 6.4). Use this in components:
 *
 *   const theme = useAppTheme();
 *   const styles = StyleSheet.create({
 *     card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg },
 *   });
 */
export function useAppTheme(): AppTheme {
  const { i18n } = useTranslation();
  return getAppTheme(resolveScheme(), i18n.language === 'hi' ? 'hi' : 'en');
}