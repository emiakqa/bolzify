import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import {
  Colors,
  FontSize,
  FontWeight,
  Fonts,
  LetterSpacing,
  LineHeight,
  Spacing,
} from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ImpressumScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ThemedText
            style={{
              color: c.textMuted,
              fontSize: FontSize.md,
              lineHeight: LineHeight.md,
              fontFamily: Fonts?.rounded,
            }}>
            ← Zurück
          </ThemedText>
        </Pressable>

        <ThemedText style={[styles.h1, { color: c.text }]}>Impressum</ThemedText>

        <Card padding="lg" style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>
            Angaben gemäß § 5 TMG
          </ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            Emirhan Akkaya{'\n'}
            Fabriciusstraße 13{'\n'}
            22177 Hamburg{'\n'}
            Deutschland
          </ThemedText>
        </Card>

        <Card padding="lg" style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>Kontakt</ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            E-Mail: emi.ak@live.de
          </ThemedText>
        </Card>

        <Card padding="lg" style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            Emirhan Akkaya{'\n'}Anschrift wie oben
          </ThemedText>
        </Card>

        <Card padding="lg" style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>Haftungsausschluss</ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            Bolzify ist ein privates Tippspiel unter Freunden. Kein Glücksspiel, kein
            Einsatz, keine Gewinnausschüttung. Für die Richtigkeit der Spielpläne und
            Ergebnisse aus externen Datenquellen übernehmen wir keine Gewähr.
          </ThemedText>
        </Card>

        <ThemedText style={[styles.footer, { color: c.textFaint }]}>
          Stand: {new Date().toLocaleDateString('de-DE')}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo },
  back: { marginBottom: Spacing.md },
  h1: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    marginBottom: Spacing.xl,
  },
  section: { marginBottom: Spacing.md },
  heading: {
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontFamily: Fonts?.rounded,
    fontWeight: FontWeight.heavy,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontFamily: Fonts?.rounded,
  },
  footer: {
    marginTop: Spacing.lg,
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
    fontFamily: Fonts?.rounded,
    textAlign: 'center',
  },
});
