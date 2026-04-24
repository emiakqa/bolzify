import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ImpressumScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ThemedText style={{ color: c.textMuted }}>← Zurück</ThemedText>
        </Pressable>

        <ThemedText style={[styles.h1, { color: c.text }]}>Impressum</ThemedText>

        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>
            Angaben gemäß § 5 TMG
          </ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            Emirhan Akkaya{'\n'}
            Fabriciusstraße 13{'\n'}
            22177 Hamburg{'\n'}
            Deutschland
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>Kontakt</ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            E-Mail: emi.ak@live.de
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            Emirhan Akkaya{'\n'}Anschrift wie oben
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: c.text }]}>Haftungsausschluss</ThemedText>
          <ThemedText style={[styles.body, { color: c.textMuted }]}>
            Bolzify ist ein privates Tippspiel unter Freunden. Kein Glücksspiel, kein
            Einsatz, keine Gewinnausschüttung. Für die Richtigkeit der Spielpläne und
            Ergebnisse aus externen Datenquellen übernehmen wir keine Gewähr.
          </ThemedText>
        </View>

        <ThemedText style={[styles.footer, { color: c.textFaint }]}>
          Stand: {new Date().toLocaleDateString('de-DE')}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  back: { marginBottom: Spacing.md },
  h1: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.xl },
  heading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  footer: {
    marginTop: Spacing.xl,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
