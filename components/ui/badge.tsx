import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Colors, Fonts, LetterSpacing, Radius } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Tone = 'neutral' | 'accent' | 'warm' | 'live' | 'success' | 'warn' | 'danger';

type Props = {
  label: string;
  tone?: Tone;
  leading?: ReactNode;
  style?: ViewStyle;
};

/**
 * Bolzplatz-Badge — Pill mit Mono-Font (JetBrainsMono SemiBold 11px),
 * letter-spacing 0.3. Wird für Status-Anzeigen (LIVE, +N PKT, GRP A · M1)
 * und Pill-Marker (Tipp 2:0, "tippen") genutzt.
 *
 * Hintergrund ist immer eine getintete Variante der Tone-Farbe (nicht voll
 * gefüllt) — Badges dürfen nicht visuell dominieren.
 */
export function Badge({ label, tone = 'neutral', leading, style }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const map: Record<Tone, { bg: string; fg: string; border?: string }> = {
    neutral: { bg: c.surfaceSunken, fg: c.textMuted, border: c.border },
    accent: { bg: c.accentSoft, fg: c.accent, border: c.accentBorder },
    warm: { bg: c.warmSoft, fg: c.warm, border: c.warmBorder },
    live: { bg: c.liveSoft, fg: c.live, border: c.warmBorder },
    success: { bg: c.accentSoft, fg: c.accent, border: c.accentBorder },
    warn: { bg: c.warnSoft, fg: c.warn },
    danger: { bg: c.dangerSoft, fg: c.danger },
  };

  const t = map[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: t.bg,
          borderColor: t.border ?? 'transparent',
          borderWidth: t.border ? 1 : 0,
        },
        style,
      ]}>
      {leading}
      <Text
        style={{
          color: t.fg,
          fontSize: 11,
          fontFamily: Fonts.mono.semibold,
          letterSpacing: LetterSpacing.pillLabel,
        }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});
