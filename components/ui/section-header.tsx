import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, FontWeight, Fonts, LetterSpacing, Spacing } from '@/constants/design';
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
 * Section-Header in modernen Apps: kein UPPERCASE-Spam mehr, sondern eine
 * sub-tile Mini-Headline mit Akzent-Farbe für die Action.
 * Verwendet rounded-Font für freundlichere Wirkung.
 */
export function SectionHeader({ title, action, leading, marginTop = Spacing.xl }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  return (
    <View style={[styles.row, { marginTop, marginBottom: Spacing.sm + 2 }]}>
      <View style={styles.titleWrap}>
        {leading ? <View>{leading}</View> : null}
        <Text
          style={{
            color: c.textMuted,
            fontSize: FontSize.xs,
            fontWeight: FontWeight.bold,
            fontFamily: Fonts?.rounded,
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
              fontSize: FontSize.sm,
              fontWeight: FontWeight.semibold,
              fontFamily: Fonts?.rounded,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
