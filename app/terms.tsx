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

export default function TermsScreen() {
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

        <ThemedText style={[styles.h1, { color: c.text }]}>Nutzungsbedingungen</ThemedText>

        <Section heading="1. Geltungsbereich" c={c}>
          Diese Nutzungsbedingungen gelten für die Nutzung der mobilen App „Bolzify"
          durch alle registrierten Nutzer:innen. Anbieter ist Emirhan Akkaya (siehe Impressum).
        </Section>

        <Section heading="2. Leistung" c={c}>
          Bolzify ist ein privates Tipp-Spiel rund um Fußballturniere. Die Nutzung
          ist kostenlos. Wir stellen die App im Rahmen unserer technischen
          Möglichkeiten bereit, garantieren aber keine ständige Verfügbarkeit
          oder Fehlerfreiheit.
        </Section>

        <Section heading="3. Kein Glücksspiel" c={c}>
          Bolzify ist kein Glücksspiel. Es gibt keinen Geldeinsatz, keine
          Auszahlung von Gewinnen und keinen vermögenswerten Vorteil. Tipps
          dienen ausschließlich der Unterhaltung.
        </Section>

        <Section heading="4. Konto" c={c}>
          {'• Mindestalter: 13 Jahre.\n'}
          {'• Du behandelst dein Passwort vertraulich.\n'}
          {'• Pro Person ist ein Konto erlaubt — Mehrfach-Accounts zur Manipulation\n'}
          {'   von Liga-Tabellen sind untersagt.\n'}
          {'• Du kannst dein Konto jederzeit in den Einstellungen löschen.'}
        </Section>

        <Section heading="5. Verhaltensregeln" c={c}>
          Bei Nutzernamen, Liga-Namen, Profilbildern und Liga-Nachrichten gilt:
          {'\n\n'}• Keine Beleidigungen, kein Hass, keine Diskriminierung.
          {'\n'}• Keine pornografischen, gewaltverherrlichenden oder rechtswidrigen Inhalte.
          {'\n'}• Keine Verletzung von Marken- oder Urheberrechten Dritter.
          {'\n'}• Keine Werbung oder Spam.
          {'\n'}• Keine Manipulationsversuche der App oder Server.
          {'\n\n'}Bei Verstößen können wir Inhalte entfernen und Konten sperren.
        </Section>

        <Section heading="6. Lizenz" c={c}>
          Du erhältst ein einfaches, nicht übertragbares, widerrufliches Recht,
          die App auf deinem Endgerät zu nutzen. Reverse Engineering und
          Dekompilierung sind nicht gestattet.
        </Section>

        <Section heading="7. Inhalte Dritter" c={c}>
          Spielpläne und Ergebnisse beziehen wir von api-football.com — keine
          Gewähr für Aktualität oder Richtigkeit. Korrekturen erfolgen automatisch
          beim nächsten Update.
          {'\n\n'}„FIFA Fußball-Weltmeisterschaft" und alle Logos sind Marken
          ihrer Inhaber. Bolzify steht in keinerlei offiziellem Verhältnis zur
          FIFA, UEFA, DFB oder einem anderen Verband.
        </Section>

        <Section heading="8. Haftung" c={c}>
          Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit und
          Verletzung von Leben, Körper, Gesundheit. Im Übrigen ist die Haftung
          auf vorhersehbare, vertragstypische Schäden begrenzt. Eine Haftung
          für mittelbare Folgeschäden aus Datenfehlern Dritter ist ausgeschlossen.
        </Section>

        <Section heading="9. Verfügbarkeit" c={c}>
          Es besteht kein Anspruch auf ständige Verfügbarkeit. Wartungsarbeiten
          oder Ausfälle bei Dienstleistern können zu Unterbrechungen führen.
        </Section>

        <Section heading="10. Vertragslaufzeit" c={c}>
          Unbestimmte Zeit. Du kannst jederzeit dein Konto löschen. Wir können
          bei groben Verstößen fristlos sperren.
        </Section>

        <Section heading="11. Änderungen" c={c}>
          Wir können diese Bedingungen anpassen. Wesentliche Änderungen kündigen
          wir in der App an.
        </Section>

        <Section heading="12. Anwendbares Recht" c={c}>
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.
          Verbraucher:innen genießen zusätzlich den Schutz zwingender
          Vorschriften ihres Heimatlandes.
        </Section>

        <Section heading="13. Salvatorische Klausel" c={c}>
          Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit
          der übrigen Bestimmungen unberührt.
        </Section>

        <ThemedText style={[styles.footer, { color: c.textFaint }]}>
          Stand: 5. Mai 2026
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  heading,
  children,
  c,
}: {
  heading: string;
  children: React.ReactNode;
  c: (typeof Colors)['light'];
}) {
  return (
    <Card padding="lg" style={styles.section}>
      <ThemedText style={[styles.heading, { color: c.text }]}>{heading}</ThemedText>
      <ThemedText style={[styles.body, { color: c.textMuted }]}>{children}</ThemedText>
    </Card>
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
