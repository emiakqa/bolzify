// Bolzplatz Design v1 — finale Tokens (Hybrid Mood 02 + Akzente 01)
// Quelle für alle Mock-Screens. 1:1 nach design.ts portierbar.

const palette = {
  // Bolzplatz-Grün (Brand-Akzent, bleibt)
  green50:  "#E8F4EC",
  green100: "#D1E9D8",
  green200: "#A6D5B5",
  green400: "#4ADE80",
  green500: "#22C55E",
  green600: "#16A34A",
  green700: "#15803D",
  green800: "#0F4D2C",

  // Tor-Orange (sek. Akzent für Sondertipps/Streaks/Live)
  orange50:  "#FBE8DD",
  orange300: "#F2A684",
  orange500: "#E8744E",
  orange600: "#C95A36",

  // Papier-Skala (warm, nicht grünlich getönt — sauberer Off-White)
  paper50:  "#FBF8F1",
  paper100: "#F4F1EA",  // bg light
  paper200: "#EDE7DA",
  ink50:    "#9AA89F",
  ink400:   "#5C6B62",
  ink600:   "#2A332D",
  ink800:   "#16201A",
  ink900:   "#0E1A12",  // text light

  // Dark-Skala (OLED-tauglich, leicht grünlich getönt — bleibt)
  night950: "#06090A",
  night900: "#0E1416",
  night800: "#171F22",
  night700: "#202A2D",

  // Status
  danger:   "#E5484D",
  warn:     "#E8A53C",
  info:     "#4F9CDC",
};

const tokens = {
  light: {
    bg: palette.paper100,
    surface: "#FFFFFF",
    surfaceSunken: palette.paper50,
    surfaceTint: palette.green50,
    border: "rgba(15,30,20,0.06)",
    borderStrong: "rgba(15,30,20,0.12)",
    divider: "rgba(15,30,20,0.08)",

    text: palette.ink900,
    textMuted: palette.ink400,
    textFaint: palette.ink50,

    accent: palette.green700,
    accentHover: palette.green600,
    accentSoft: palette.green50,
    accentBorder: "rgba(21,128,61,0.30)",
    accentFg: "#FFFFFE",

    warm: palette.orange500,
    warmSoft: palette.orange50,
    warmBorder: "rgba(232,116,78,0.30)",
    warmFg: "#FFFFFE",

    live: palette.orange500,
    liveSoft: "rgba(232,116,78,0.14)",
    danger: palette.danger,
    dangerSoft: "rgba(229,72,77,0.10)",
    success: palette.green600,
    warn: palette.warn,

    tabActive: palette.green700,
    tabInactive: palette.ink50,

    // Schatten — soft, warm-ink statt purem Schwarz
    shadowSm: "0 1px 2px rgba(15,30,20,0.05), 0 1px 3px rgba(15,30,20,0.04)",
    shadowMd: "0 4px 14px rgba(15,30,20,0.07), 0 1px 3px rgba(15,30,20,0.04)",
    shadowLg: "0 12px 32px rgba(15,30,20,0.12), 0 2px 6px rgba(15,30,20,0.05)",
  },
  dark: {
    bg: palette.night950,
    surface: palette.night900,
    surfaceSunken: palette.night950,
    surfaceTint: "rgba(34,197,94,0.06)",
    border: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.14)",
    divider: "rgba(255,255,255,0.08)",

    text: "#ECF1F0",
    textMuted: "#7A8A86",
    textFaint: "#4F5C58",

    accent: palette.green500,
    accentHover: palette.green400,
    accentSoft: "rgba(34,197,94,0.14)",
    accentBorder: "rgba(34,197,94,0.40)",
    accentFg: "#062611",

    warm: palette.orange500,
    warmSoft: "rgba(232,116,78,0.16)",
    warmBorder: "rgba(232,116,78,0.40)",
    warmFg: "#1A0F00",

    live: palette.orange500,
    liveSoft: "rgba(232,116,78,0.16)",
    danger: palette.danger,
    dangerSoft: "rgba(229,72,77,0.16)",
    success: palette.green500,
    warn: palette.warn,

    tabActive: palette.green400,
    tabInactive: "#5A695F",

    shadowSm: "0 1px 2px rgba(0,0,0,0.4)",
    shadowMd: "0 4px 14px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)",
    shadowLg: "0 12px 32px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)",
  },
};

const Spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
const Radius = { sm: 10, md: 14, lg: 20, xl: 24, xxl: 32, pill: 999 };
const FontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28, display: 36, jumbo: 48 };

const fonts = {
  display: "'Familjen Grotesk', 'SF Pro Rounded', system-ui, sans-serif",
  body: "'Geist', 'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

window.bolzTokens = tokens;
window.bolzPalette = palette;
window.bolzFonts = fonts;
window.bolzSpacing = Spacing;
window.bolzRadius = Radius;
window.bolzFontSize = FontSize;
