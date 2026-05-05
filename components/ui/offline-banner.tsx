import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, LetterSpacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIsOnline } from '@/lib/network';

/**
 * Subtiles "Du bist offline"-Banner direkt unter der Statusbar.
 * Wird global am Root gemountet — rendert nichts wenn online.
 *
 * Bewusst KEIN modaler Block — die App soll weiter benutzbar bleiben
 * (gecachte Daten anzeigen). Nur ein Hinweis, dass aktuell nichts neu
 * geladen werden kann.
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  if (online) return null;

  return (
    <SafeAreaView edges={['top']} style={[styles.wrap, { backgroundColor: c.warn }]}>
      <View style={styles.inner}>
        <Text style={styles.dot}>●</Text>
        <Text
          style={{
            color: '#0E1A12',
            fontFamily: Fonts.mono.bold,
            fontSize: 11,
            letterSpacing: LetterSpacing.label,
            textTransform: 'uppercase',
          }}>
          Offline · neue Daten kommen sobald Netz da ist
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dot: {
    color: '#0E1A12',
    fontSize: 10,
  },
});
