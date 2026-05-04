import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, LetterSpacing, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  title: string;
  /** Optional rechtsbündige Action (z.B. "Alle ›"). */
  action?: { label: string; onPress: () => void };
  /** Optional Icon links neben dem Titel. */
  leading?: ReactNode;
  /** Margin-top — default xl. 0 für direkt nach dem Header oben. */
  marginTop?: number;
};

/**
 * Bolzplatz-SectionLabel: UPPERCASE Mono mit letter-spacing 1.4.
 * Das prägnanteste typografische Element der Direction.
 *
 * Optional `action` rechts (Akzent-Farbe, "‹text› ›").
 */
export function SectionHeader({ title, action, leading, marginTop = Spacing.xl }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  return (
    <View style={[styles.row, { marginTop, marginBottom: Spacing.sm }]}>
      <View style={styles.titleWrap}>
        {leading ? <View>{leading}</View> : null}
        <Text
          style={{
            color: c.textMuted,
            fontSize: 11,
            fontFamily: Fonts.mono.bold,
            textTransform: 'uppercase',
            letterSpacing: LetterSpacing.label,
          }}>
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={10}>
          <Text
            style={{
              color: c.accent,
              fontSize: 13,
              fontFamily: Fonts.body.semibold,
            }}>
            {action.label} ›
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
