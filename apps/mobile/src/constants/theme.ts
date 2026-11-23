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

/**
 * Professional NBFC Financial Palette (PRD Section 6.4 + Redesign Spec).
 * Primary Yellow (#F4C444), Secondary Teal (#4C98A8), Interactive Blue (#3478F4),
 * Danger Red (#C8444C), Success Green (#2FA45A).
 * Neutrals: Background (#F8F8F8), Surface (#FFFFFF), Border (#E0E0E0),
 * Primary Text (#333333), Secondary Text (#787878), Muted Surface (#F2F3F4).
 */
const Palette = {
  yellow: { primary: '#F4C444', soft: '#FDF7E7', dark: '#C89B1E' },
  teal: { secondary: '#4C98A8', soft: '#EDF5F7', dark: '#37737F' },
  blue: { interactive: '#3478F4', soft: '#EBF2FE', dark: '#1F5BD1' },
  red: { danger: '#C8444C', soft: '#FCEEED', dark: '#A42A31' },
  green: { success: '#2FA45A', soft: '#EBF7EE', dark: '#227C44' },
  amber: { warning: '#E0981E', soft: '#FEF7E8', dark: '#B5740E' },
  neutral: {
    bg: '#F8F8F8',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    textPrimary: '#333333',
    textSecondary: '#787878',
    mutedSurface: '#F2F3F4',
  },
} as const;

/**
 * Semantic colour roles, light + dark. Follows the system setting.
 * High-contrast, authoritative, accessible financial management theme.
 */
export const AppColors = {
  light: {
    primary: Palette.yellow.primary, // Dominant brand accent, highlights, primary action cards
    onPrimary: '#1A1A1A', // Dark text on yellow (contrast > 11:1)
    secondary: Palette.teal.secondary, // Secondary navigation tabs, categories, accents
    onSecondary: '#FFFFFF', // White text on teal
    interactive: Palette.blue.interactive, // Links, interactive elements, navigation markers
    background: Palette.neutral.bg, // Main app background #F8F8F8
    surface: Palette.neutral.surface, // Cards, tables, panels #FFFFFF
    card: Palette.neutral.surface, // Surface container #FFFFFF
    canvas: Palette.neutral.bg, // Canvas tint #F8F8F8
    border: Palette.neutral.border, // Dividers, table borders #E0E0E0
    textPrimary: Palette.neutral.textPrimary, // Headings & important content #333333
    textSecondary: Palette.neutral.textSecondary, // Supporting information #787878
    mutedSurface: Palette.neutral.mutedSurface, // Search fields, table headers, subtle backdrops #F2F3F4
    success: Palette.green.success, // Successful payments, positive indicators #2FA45A
    successSoft: Palette.green.soft, // Soft green tint #EBF7EE
    danger: Palette.red.danger, // NPA, critical statuses, alerts, overdue #C8444C
    dangerSoft: Palette.red.soft, // Soft red alert tint #FCEEED
    warning: Palette.amber.warning, // Warning & partial statuses
    warningSoft: Palette.amber.soft, // Soft amber tint
    info: Palette.blue.interactive, // Informational #3478F4
    primarySoft: Palette.yellow.soft, // Soft yellow highlight banner #FDF7E7
    secondarySoft: Palette.teal.soft, // Soft teal tint #EDF5F7
  },
  dark: {
    primary: Palette.yellow.primary,
    onPrimary: '#1A1A1A',
    secondary: '#5EAFC0',
    onSecondary: '#121212',
    interactive: '#4D8DFE',
    background: '#121212',
    surface: '#1E1E1E',
    card: '#1E1E1E',
    canvas: '#121212',
    border: '#2E2E2E',
    textPrimary: '#EDEDED',
    textSecondary: '#A0A0A0',
    mutedSurface: '#252525',
    success: '#34C759',
    successSoft: '#14291A',
    danger: '#E0535B',
    dangerSoft: '#2C1416',
    warning: '#F5A623',
    warningSoft: '#2D200E',
    info: '#4D8DFE',
    primarySoft: '#2C2616',
    secondarySoft: '#142629',
  },
} as const;

/** Spacing scale (4 / 8 / 12 / 16 / 24 / 32). */
export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const AppRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

/**
 * Typography hierarchy as specified in the redesign specification:
 * - Page title: 24–30px, semibold
 * - Section title: 18–22px, semibold
 * - Table headers: 15–17px, bold
 * - Body text: 14–16px, regular
 * - Important values: 16–18px, semibold
 * - Supporting text: 12–14px, regular
 * - Metadata: 11–12px, regular
 */
export const AppTypography = {
  size: {
    metadata: 12,
    caption: 13,
    body: 15,
    important: 17,
    tableHeader: 16,
    subtitle: 20,
    title: 26,
    heading: 30,
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
 * Motion tokens (impeccable-native motion vocabulary).
 * Timing and spring presets for 60-120Hz native animations.
 */
export const AppMotion = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  spring: {
    snappy: { damping: 28, stiffness: 300, mass: 1, overshootClamping: true },
    gentle: { damping: 24, stiffness: 180, mass: 1, overshootClamping: true },
    soft: { damping: 30, stiffness: 100, mass: 1, overshootClamping: true },
  },
} as const;

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
  motion: typeof AppMotion;
};

export function getAppTheme(scheme: AppColorScheme): AppTheme {
  return {
    scheme,
    colors: AppColors[scheme],
    spacing: AppSpacing,
    radius: AppRadius,
    typography: AppTypography,
    touchTarget: AppTouchTarget,
    motion: AppMotion,
  };
}
