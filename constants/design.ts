// Bolzify Design-Tokens
// Ein einziger Ort für Farben, Typo, Spacing. Alle Screens greifen hier zu.
// Keine Farbwerte irgendwo inline — wenn was fehlt, hier ergänzen.

import { Platform } from 'react-native';

// Farb-Philosophie:
// - Grün als Haupt-Akzent (Bolzplatz-Rasen, nicht neon)
// - Warmes Dunkelbraun als Nostalgie-Akzent (Leder-Ball / alte Tribüne)
// - Signal-Orange sparsam für CTA & Live-Zustände
// - Neutral-Graus für Flächen & Text
// Dark ist der Default-Look ("Flutlicht"), Light als Fallback.

const palette = {
  // Bolzplatz-Grün
  grass50: '#E8F5E9',
  grass300: '#66BB6A',
  grass500: '#2E7D32',
  grass700: '#1B5E20',

  // Leder / Nostalgie
  leather400: '#8D6E63',
  leather600: '#5D4037',

  // Signal / Live
  signal500: '#FF6F00',
  signal300: '#FFB74D',

  // Status
  danger500: '#D32F2F',
  warn500: '#F9A825',
  success500: '#388E3C',

  // Neutral
  neutral0: '#FFFFFF',
  neutral50: '#FAFAFA',
  neutral100: '#F5F5F5',
  neutral200: '#EEEEEE',
  neutral300: '#E0E0E0',
  neutral500: '#9E9E9E',
  neutral700: '#424242',
  neutral800: '#2A2A2A',
  neutral900: '#1A1A1A',
  neutral950: '#0F0F0F',
};

export const Colors = {
  dark: {
    // Hintergründe
    bg: palette.neutral950,
    background: palette.neutral950, // alias für Legacy-Themed-View
    surface: palette.neutral900,
    surfaceElevated: palette.neutral800,
    border: palette.neutral700,

    // Text
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    textFaint: '#6E7478',

    // Akzente
    accent: palette.grass500,
    accentHover: palette.grass300,
    accentFg: palette.neutral0,
    tint: palette.grass300, // alias

    nostalgia: palette.leather400,

    // Zustände
    live: palette.signal500,
    liveFg: palette.neutral0,
    danger: palette.danger500,
    success: palette.success500,
    warn: palette.warn500,

    // Tabs / Icons
    icon: '#9BA1A6',
    tabActive: palette.grass300,
    tabInactive: palette.neutral500,
    tabIconDefault: palette.neutral500,
    tabIconSelected: palette.grass300,
  },
  light: {
    bg: palette.neutral0,
    background: palette.neutral0,
    surface: palette.neutral50,
    surfaceElevated: palette.neutral100,
    border: palette.neutral300,

    text: '#11181C',
    textMuted: '#687076',
    textFaint: '#9BA1A6',

    accent: palette.grass700,
    accentHover: palette.grass500,
    accentFg: palette.neutral0,
    tint: palette.grass700,

    nostalgia: palette.leather600,

    live: palette.signal500,
    liveFg: palette.neutral0,
    danger: palette.danger500,
    success: palette.success500,
    warn: palette.warn500,

    icon: '#687076',
    tabActive: palette.grass700,
    tabInactive: palette.neutral500,
    tabIconDefault: palette.neutral500,
    tabIconSelected: palette.grass700,
  },
};

// 8pt-Grid. In StyleSheets: `padding: Spacing.md` statt Magic Numbers.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 34,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.dark;
