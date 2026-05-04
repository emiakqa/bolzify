// Bolzify · BolzLogo — Wortmarke "Bolz." mit Kickoff-Circle-Punkt.
// Quelle: bolz-logo-handoff/react/BolzLogo.jsx (1:1 nach RN portiert).
//
// Brand-Decision A (Logomark-Refresh only): Visuelle Marke ist "Bolz."
// — der App-Name "Bolzify" bleibt überall sonst unverändert.
//
// Construction (em-relativ):
//   dotDiameter:        0.21em
//   dotStroke:          0.038em
//   dotInner:           0.06em
//   dotGap:             0.06em
//   dotBaselineOffset:  0.04em
//   letterSpacing:     -0.052em
//
// Hinweis: Familjen Grotesk hat kein 800 ExtraBold (Google Font endet bei 700)
// — wir nutzen Fonts.display.heavy (= FamiljenGrotesk_700Bold). Visuell minimal
// weniger fett als das Handoff-Sample, aber konsistent mit dem Rest der App.

import { Text, View, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/design';

const PALETTE = {
  // Paper/Off-White Plate, dunkler Wordmark, Bolzplatz-Grün-Akzent
  light: { bg: '#F4F1EA', fg: '#0E1A12', accent: '#15803D' },
  // Grüne Plate (Akzent als Background), heller Wordmark + Akzent
  brand: { bg: '#15803D', fg: '#F4F1EA', accent: '#F4F1EA' },
  // OLED-Schwarze Plate, hell, helles Grün als Akzent
  dark: { bg: '#06090A', fg: '#ECF1F0', accent: '#22C55E' },
  // Dunkler Ink-Plate, Tor-Orange Wordmark + Akzent (Sondertipp/Streak-Optik)
  mono: { bg: '#0E1A12', fg: '#E8744E', accent: '#E8744E' },
} as const;

export type BolzLogoVariant = keyof typeof PALETTE;

type Props = {
  /** Wortmarken-Höhe in px. Alle anderen Maße leiten sich davon ab. Default: 48 */
  size?: number;
  /** Farbschema. Default: "light". */
  variant?: BolzLogoVariant;
  /** Background-Farbe überschreiben. "transparent" rendert ohne Plate-Fläche. */
  bg?: string;
  /** Inline-Modus ohne padded Plate (nur Wortmarke + Punkt). Default: false. */
  inline?: boolean;
  /** Zusätzliches Container-Styling (z. B. margin). */
  style?: ViewStyle;
  /** Optionales testID für Maestro/Detox. */
  testID?: string;
};

export function BolzLogo({
  size = 48,
  variant = 'light',
  bg,
  inline = false,
  style,
  testID,
}: Props) {
  const p = PALETTE[variant];

  const dotSize = size * 0.21;
  const dotStroke = Math.max(2, size * 0.038);
  const dotInner = Math.max(1.5, size * 0.06);
  const gap = size * 0.06;
  const letterSpacing = -size * 0.052;
  const dotBaselineOffset = size * 0.04;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Bolz."
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          alignSelf: 'flex-start',
        },
        inline
          ? null
          : {
              paddingVertical: size * 0.4,
              paddingHorizontal: size * 0.5,
              backgroundColor: bg ?? p.bg,
              borderRadius: size * 0.22,
            },
        style,
      ]}>
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: Fonts.display.heavy,
          fontSize: size,
          letterSpacing,
          lineHeight: size * 0.85,
          color: p.fg,
          // Android: das default font-padding würde alignItems:'flex-end' verzerren
          includeFontPadding: false,
        }}>
        Bolz
      </Text>
      <View
        style={{
          width: dotSize,
          height: dotSize,
          marginLeft: gap,
          marginBottom: dotBaselineOffset,
          borderRadius: 999,
          borderWidth: dotStroke,
          borderColor: p.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: dotInner,
            height: dotInner,
            borderRadius: 999,
            backgroundColor: p.accent,
          }}
        />
      </View>
    </View>
  );
}

export default BolzLogo;
