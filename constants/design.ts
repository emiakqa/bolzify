// Bolzify Design-Tokens
// Ein einziger Ort für Farben, Typo, Spacing, Radien, Schatten.
// Alle Screens greifen hier zu — keine Magic Numbers in StyleSheets.

import { Platform } from 'react-native';

// Farb-Philosophie 2.0 (Stand v0.15):
// - Akzent = Tailwind-Grün #22C55E (matched die Web-Pages, kontrastreich auf Dunkel)
// - Surface = warm-getöntes Anthrazit, leicht ins Grünliche (statt neutral-grau)
//   → wirkt lebendig, nicht klinisch
// - True-Black-Background nur für OLED-Optik in Dark
// - Generell: weniger Saturation, mehr Tiefe durch Layering

const palette = {
  // Bolzplatz-Grün (Akzent) — Tailwind-Skala für moderne Apps
  green50: '#E8FBF0',
  green200: '#A6EEC1',
  green400: '#4ADE80',
  green500: '#22C55E', // Haupt-Akzent
  green600: '#16A34A',
  green700: '#15803D',

  // Leder / Nostalgie — gedämpfter, dezenter Sekundär-Akzent
  leather400: '#A88671',
  leather600: '#6B4F3D',

  // Signal / Live (Orange) — etwas wärmer
  signal500: '#FB923C',
  signal400: '#FDBA74',

  // Status
  danger500: '#F43F5E', // Rosa-Rot, weicher als reines Rot
  warn500: '#F59E0B',
  success500: '#22C55E',

  // Neutrale Skala — leicht ins Grüne getönt für Konsistenz mit Akzent
  // (statt purer Grau-Skala — gibt der App eine klare Tönung)
  ink0: '#FFFFFF',
  ink50: '#F7F9F8',
  ink100: '#EFF3F0',
  ink200: '#DDE4DF',
  ink300: '#B8C4BC',
  ink400: '#7E8E83',
  ink500: '#5A695F',
  ink600: '#3E4944',
  ink700: '#2A322D',
  ink800: '#1B221E',
  ink900: '#121613',
  ink950: '#0A0D0B', // True-Black mit Hauch Grün
};

export const Colors = {
  dark: {
    // Hintergründe — 3-stufiges Layering für Tiefe
    bg: palette.ink950,
    background: palette.ink950, // alias für Legacy-Themed-View
    surface: palette.ink800,
    surfaceElevated: palette.ink700,
    surfaceHi: palette.ink600, // höchste Elevation (Modals, Pop-Ups)
    border: 'rgba(255,255,255,0.06)', // sehr dezenter Border (statt fester Linie)
    borderStrong: 'rgba(255,255,255,0.12)',

    // Text
    text: '#F2F5F3',
    textMuted: palette.ink400,
    textFaint: palette.ink500,

    // Akzente
    accent: palette.green500,
    accentSoft: 'rgba(34,197,94,0.14)', // für Background-Tints
    accentBorder: 'rgba(34,197,94,0.35)',
    accentHover: palette.green400,
    accentFg: '#062611',
    tint: palette.green400, // alias

    nostalgia: palette.leather400,

    // Zustände
    live: palette.signal500,
    liveFg: '#1A0F00',
    liveSoft: 'rgba(251,146,60,0.16)',
    danger: palette.danger500,
    dangerSoft: 'rgba(244,63,94,0.16)',
    success: palette.success500,
    warn: palette.warn500,
    warnSoft: 'rgba(245,158,11,0.16)',

    // Tabs / Icons
    icon: palette.ink400,
    tabActive: palette.green400,
    tabInactive: palette.ink500,
    tabIconDefault: palette.ink500,
    tabIconSelected: palette.green400,
  },
  light: {
    bg: palette.ink50,
    background: palette.ink50,
    surface: palette.ink0,
    surfaceElevated: palette.ink100,
    surfaceHi: palette.ink0,
    border: 'rgba(0,0,0,0.06)',
    borderStrong: 'rgba(0,0,0,0.12)',

    text: '#0F1A12',
    textMuted: palette.ink500,
    textFaint: palette.ink400,

    accent: palette.green600,
    accentSoft: 'rgba(34,197,94,0.10)',
    accentBorder: 'rgba(22,163,74,0.30)',
    accentHover: palette.green500,
    accentFg: palette.ink0,
    tint: palette.green600,

    nostalgia: palette.leather600,

    live: palette.signal500,
    liveFg: palette.ink0,
    liveSoft: 'rgba(251,146,60,0.12)',
    danger: palette.danger500,
    dangerSoft: 'rgba(244,63,94,0.10)',
    success: palette.success500,
    warn: palette.warn500,
    warnSoft: 'rgba(245,158,11,0.10)',

    icon: palette.ink500,
    tabActive: palette.green600,
    tabInactive: palette.ink400,
    tabIconDefault: palette.ink400,
    tabIconSelected: palette.green600,
  },
};

// 4pt-Grid (feiner als 8pt für Mikro-Layouts).
// In StyleSheets: `padding: Spacing.md` statt Magic Numbers.
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  jumbo: 64,
};

// Radien — moderne Apps sind großzügig rund. Pille für Pills/Buttons.
// Kein Wert unter 10 (eckige Karten wirken altmodisch).
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
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
  jumbo: 44,
};

// Explizite Line-Heights — zwingend für große Headlines, da iOS mit
// `ui-rounded`-Font sehr knappe Default-Metrics hat und Großbuchstaben oben
// abschneidet. Faustregel: ~1.15-1.2 × FontSize für Headlines, ~1.4 für Fließtext.
// Mind. 4-6pt extra Spielraum, sonst werden Akzent-Buchstaben (Ä, Ö, Ü, @, /)
// am oberen Rand geclippt.
export const LineHeight = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 24,
  xl: 28,
  xxl: 34,
  display: 44,
  jumbo: 54,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

// Sub-pixel letter-spacing für tighter, moderne Display-Texte.
export const LetterSpacing = {
  display: -0.6,
  heading: -0.3,
  body: 0,
  label: 0.4, // für UPPERCASE-Section-Labels
};

// Schatten-System. Auf Android wird `elevation` genutzt, auf iOS die Shadow-Props.
// Wir geben pro Stufe ein passendes Gesamtobjekt zurück, sodass Components
// einfach `...Shadow.md` spreaden können.
export const Shadow = Platform.select({
  ios: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
    },
  },
  default: {
    sm: { elevation: 2 },
    md: { elevation: 6 },
    lg: { elevation: 12 },
  },
})!;

export const Fonts = Platform.select({
  ios: {
    // Moderne iOS-Apps nutzen ui-rounded für freundlichere, weichere Wirkung.
    // System-Default für Body, Rounded für Headlines + UI-Akzente.
    sans: 'system-ui',
    rounded: 'ui-rounded',
    serif: 'ui-serif',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    serif: 'serif',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    rounded: "'SF Pro Rounded', system-ui, -apple-system, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.dark;
