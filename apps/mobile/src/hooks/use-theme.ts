/**
 * Theme hook for the loan app. Light/dark follows the system setting.
 * Learn more: https://docs.expo.dev/guides/color-schemes/
 */

import { getAppTheme, type AppTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * useAppTheme — returns the loan app's design-token theme (PRD 6.4), following the
 * system light/dark setting. Use this in loan-app components:
 *
 *   const theme = useAppTheme();
 *   const styles = StyleSheet.create({
 *     card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg },
 *   });
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return getAppTheme(scheme === 'dark' ? 'dark' : 'light');
}
