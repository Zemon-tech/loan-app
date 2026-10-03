/**
 * Theme for the loan app. The design tokens below are the single source of truth
 * (PRD Section 6.4). Styling approach: design tokens + React Native StyleSheet.
 * Tailwind / NativeWind (and Tamagui, unistyles, etc.) are intentionally NOT used.
 * See AGENTS.md and docs/DECISIONS.md.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Platform font families (system fonts; web uses the CSS vars from global.css). */
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// ============================================================================
// App design tokens (PRD Section 6.4) — SINGLE source of truth for the loan app.
// Build the UI from these via `useAppTheme()` (src/hooks/use-theme.ts).
// Never hardcode a colour or size in a component; always reference a token.
// ============================================================================

/** Semantic colour roles (11 core + 6 surface tints), light + dark. Follows the system setting. */
export const AppColors = {
  light: {
    primary: '#1E63E9',
    onPrimary: '#FFFFFF',
    background: '#FFFFFF',
    surface: '#F6F7F9',
    textPrimary: '#111827',
    textSecondary: '#60646C',
    border: '#E0E1E6',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',
    // Auth / entry surfaces (mockups): lavender page tint, white card, soft tints.
    canvas: '#F9F9FF',
    card: '#FFFFFF',
    primarySoft: '#E8EEFF',
    successSoft: '#DCFCE7',
    dangerSoft: '#FDECEC',
    warningSoft: '#FEF3C7',
  },
  dark: {
    primary: '#4F8CFF',
    onPrimary: '#06121F',
    background: '#000000',
    surface: '#16181B',
    textPrimary: '#F3F4F6',
    textSecondary: '#B0B4BA',
    border: '#2E3135',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#60A5FA',
    canvas: '#000000',
    card: '#16181B',
    primarySoft: '#16233F',
    successSoft: '#0F2A1A',
    dangerSoft: '#2A1416',
    warningSoft: '#2B2110',
  },
} as const;

/** Spacing scale (PRD 6.4: 4 / 8 / 12 / 16 / 24 / 32). */
export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const AppRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 20,
  pill: 999,
} as const;

/**
 * Typography. System font, scalable. Minimum body size 16 (PRD 6.4).
 * Respect OS font scaling up to 200% — do not disable `allowFontScaling`.
 */
export const AppTypography = {
  size: {
    caption: 13,
    body: 16, // minimum body size
    subtitle: 18,
    title: 22,
    heading: 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/** Minimum touch target (PRD 6.4: >= 44 x 44 pt). */
export const AppTouchTarget = { min: 44 } as const;

/**
 * Installment / status colour mapping (PRD 6.4).
 * ALWAYS pair the colour with a text label and an icon — never colour alone.
 */
export const StatusColorRole = {
  PAID: 'success',
  PARTIAL: 'warning',
  OVERDUE: 'danger',
  DUE_TODAY: 'info',
  UPCOMING: 'textSecondary',
} as const;

export type AppColorScheme = keyof typeof AppColors; // 'light' | 'dark'
export type AppColorRole = keyof (typeof AppColors)['light'];
export type AppSpacingKey = keyof typeof AppSpacing;
export type StatusColorRoleKey = keyof typeof StatusColorRole;

/** Active palette: every colour role mapped to a hex string (scheme-agnostic). */
export type AppPalette = Record<AppColorRole, string>;

/** The full token set for one scheme (what components consume via useAppTheme). */
export type AppTheme = {
  scheme: AppColorScheme;
  colors: AppPalette;
  spacing: typeof AppSpacing;
  radius: typeof AppRadius;
  typography: typeof AppTypography;
  touchTarget: typeof AppTouchTarget;
};

export function getAppTheme(scheme: AppColorScheme): AppTheme {
  return {
    scheme,
    colors: AppColors[scheme],
    spacing: AppSpacing,
    radius: AppRadius,
    typography: AppTypography,
    touchTarget: AppTouchTarget,
  };
}
