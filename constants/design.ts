// Bolzify Design-Tokens — "Bolzplatz" Direction (v0.17)
// Quelle: design_handoff_bolzify/bolzplatz/tokens.jsx
//
// Designprinzipien:
// - Akzent-Grün #15803D (light) / #22C55E (dark) — bleibt das Brand
// - Tor-Orange #E8744E als sekundärer "warm"-Akzent für Sondertipps,
//   Live-Indikatoren, Streaks (NICHT als zweiter Standard-Akzent)
// - Light-bg = Paper-Off-White (#F4F1EA, warm) — NICHT grünlich getönt
// - Dark-bg = OLED-Schwarz (#06090A)
// - Shadows als Default (nicht Borders)
// - Pill-Buttons, große Card-Radien (R.xl = 24)
// - Mono-UPPERCASE für Section-Labels (das prägnanteste Element)

import { Platform } from 'react-native';

const palette = {
  // Bolzplatz-Grün (Brand-Akzent)
  green50: '#E8F4EC',
  green100: '#D1E9D8',
  green200: '#A6D5B5',
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#15803D',
  green800: '#0F4D2C',

  // Tor-Orange (sek. Akzent)
  orange50: '#FBE8DD',
  orange300: '#F2A684',
  orange500: '#E8744E',
  orange600: '#C95A36',

  // Papier-Skala (warm, nicht grünlich)
  paper50: '#FBF8F1',
  paper100: '#F4F1EA',
  paper200: '#EDE7DA',
  ink50: '#9AA89F',
  ink400: '#5C6B62',
  ink600: '#2A332D',
  ink800: '#16201A',
  ink900: '#0E1A12',

  // Dark-Skala (OLED-tauglich, leicht grünlich)
  night950: '#06090A',
  night900: '#0E1416',
  night800: '#171F22',
  night700: '#202A2D',

  // Status
  danger: '#E5484D',
  warn: '#E8A53C',
  info: '#4F9CDC',
};

export const Colors = {
  light: {
    bg: palette.paper100,
    background: palette.paper100, // Legacy-Alias
    surface: '#FFFFFF',
    surfaceSunken: palette.paper50,
    surfaceElevated: '#FFFFFF',
    surfaceHi: '#FFFFFF',
    surfaceTint: palette.green50,
    border: 'rgba(15,30,20,0.06)',
    borderStrong: 'rgba(15,30,20,0.12)',
    divider: 'rgba(15,30,20,0.08)',

    text: palette.ink900,
    textMuted: palette.ink400,
    textFaint: palette.ink50,

    accent: palette.green700,
    accentHover: palette.green600,
    accentSoft: palette.green50,
    accentBorder: 'rgba(21,128,61,0.30)',
    accentFg: '#FFFFFE',
    tint: palette.green700,

    warm: palette.orange500,
    warmSoft: palette.orange50,
    warmBorder: 'rgba(232,116,78,0.30)',
    warmFg: '#FFFFFE',

    live: palette.orange500,
    liveFg: '#FFFFFE',
    liveSoft: 'rgba(232,116,78,0.14)',
    danger: palette.danger,
    dangerSoft: 'rgba(229,72,77,0.10)',
    success: palette.green600,
    warn: palette.warn,
    warnSoft: 'rgba(232,165,60,0.14)',

    icon: palette.ink400,
    tabActive: palette.green700,
    tabInactive: palette.ink50,
    tabIconDefault: palette.ink50,
    tabIconSelected: palette.green700,
  },
  dark: {
    bg: palette.night950,
    background: palette.night950,
    surface: palette.night900,
    surfaceSunken: palette.night950,
    surfaceElevated: palette.night800,
    surfaceHi: palette.night700,
    surfaceTint: 'rgba(34,197,94,0.06)',
    border: 'rgba(255,255,255,0.06)',
    borderStrong: 'rgba(255,255,255,0.14)',
    divider: 'rgba(255,255,255,0.08)',

    text: '#ECF1F0',
    textMuted: '#7A8A86',
    textFaint: '#4F5C58',

    accent: palette.green500,
    accentHover: palette.green400,
    accentSoft: 'rgba(34,197,94,0.14)',
    accentBorder: 'rgba(34,197,94,0.40)',
    accentFg: '#062611',
    tint: palette.green400,

    warm: palette.orange500,
    warmSoft: 'rgba(232,116,78,0.16)',
    warmBorder: 'rgba(232,116,78,0.40)',
    warmFg: '#1A0F00',

    live: palette.orange500,
    liveFg: '#1A0F00',
    liveSoft: 'rgba(232,116,78,0.16)',
    danger: palette.danger,
    dangerSoft: 'rgba(229,72,77,0.16)',
    success: palette.green500,
    warn: palette.warn,
    warnSoft: 'rgba(232,165,60,0.16)',

    icon: '#7A8A86',
    tabActive: palette.green400,
    tabInactive: '#5A695F',
    tabIconDefault: '#5A695F',
    tabIconSelected: palette.green400,
  },
};

// 4pt-Grid
// `jumbo` ist Footer-Cushion in ScrollViews. Tab-Bar wird von expo-router
// automatisch als Inset eingefügt — wir brauchen also nur etwas Atemluft
// nach dem letzten Inhalt.
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  jumbo: 32,
};

// Cards default xl (24), Buttons immer pill.
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 32,
  pill: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  display: 36,
  jumbo: 48,
};

// LineHeight großzügig für Custom-Fonts (Familjen Grotesk hat tighter Metrics).
export const LineHeight = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 24,
  xl: 28,
  xxl: 34,
  display: 42,
  jumbo: 54,
};

// Legacy — wird mit Custom-Fonts nicht mehr ausgewertet (jedes Weight ist eine
// eigene Font-Family). Bleibt drin für Code, der noch nicht migriert ist.
export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '700' as const, // 800 nicht in Familjen Grotesk verfügbar
};

export const LetterSpacing = {
  display: -1.2,
  heading: -0.3,
  body: 0,
  label: 1.4, // für UPPERCASE Mono-Labels
  pillLabel: 0.3, // für Mono-Pills (Badges)
};

// Shadow-System. iOS via shadow*-Props, Android via elevation.
// "Soft" Schatten mit warm-ink-Tint statt purem Schwarz (light-mode).
export const Shadow = Platform.select({
  ios: {
    sm: {
      shadowColor: '#0F1E14',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    md: {
      shadowColor: '#0F1E14',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 14,
    },
    lg: {
      shadowColor: '#0F1E14',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
    },
  },
  default: {
    sm: { elevation: 1 },
    md: { elevation: 4 },
    lg: { elevation: 10 },
  },
})!;

// ============================================================================
// Fonts — Custom Google Fonts via lib/fonts.ts geladen.
// In RN gibt's keinen fontWeight-Lookup mit Custom-Fonts — jedes Weight ist
// eine eigene Font-Family. Deshalb explizite Weight-Keys statt FontWeight.
// ============================================================================

export const Fonts = {
  display: {
    regular: 'FamiljenGrotesk_400Regular',
    medium: 'FamiljenGrotesk_500Medium',
    semibold: 'FamiljenGrotesk_600SemiBold',
    bold: 'FamiljenGrotesk_700Bold',
    heavy: 'FamiljenGrotesk_700Bold', // Alias — kein 800 in Familjen
  },
  body: {
    regular: 'Geist_400Regular',
    medium: 'Geist_500Medium',
    semibold: 'Geist_600SemiBold',
    bold: 'Geist_700Bold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semibold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  },

  // Legacy-Aliasse — damit nicht-migrierte Screens kein crash bekommen.
  // Sie sehen mit dem rounded → display-bold-Mapping eh schöner aus.
  rounded: 'FamiljenGrotesk_700Bold',
  sans: 'Geist_400Regular',
  serif: 'Geist_400Regular',
};

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.light;
