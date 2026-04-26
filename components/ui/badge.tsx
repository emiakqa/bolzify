import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Colors, FontSize, FontWeight, Fonts, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Tone = 'neutral' | 'accent' | 'live' | 'success' | 'warn' | 'danger';

type Props = {
  label: string;
  tone?: Tone;
  leading?: ReactNode;
  style?: ViewStyle;
};

/**
 * Pill-Badge für Status-Anzeigen (Live, Punkte, Stage-Label etc.).
 * Hintergrund ist immer eine getintete Variante der Tone-Farbe (nicht voll
 * gefüllt), damit Badges nicht visuell dominieren.
 */
export function Badge({ label, tone = 'neutral', leading, style }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: c.surfaceElevated, fg: c.textMuted },
    accent: { bg: c.accentSoft, fg: c.accent },
    live: { bg: c.liveSoft, fg: c.live },
    success: { bg: c.accentSoft, fg: c.accent },
    warn: { bg: c.warnSoft, fg: c.warn },
    danger: { bg: c.dangerSoft, fg: c.danger },
  };

  const t = map[tone];

  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      {leading}
      <Text
        style={{
          color: t.fg,
          fontSize: FontSize.xs,
          fontWeight: FontWeight.bold,
          fontFamily: Fonts?.rounded,
          letterSpacing: 0.3,
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
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});
