import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

type DbStatus =
  | { state: 'loading' }
  | { state: 'ok'; matchCount: number }
  | { state: 'error'; message: string };

export default function HomeScreen() {
  const [db, setDb] = useState<DbStatus>({ state: 'loading' });

  useEffect(() => {
    (async () => {
      const { count, error } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });

      if (error) {
        setDb({ state: 'error', message: error.message });
      } else {
        setDb({ state: 'ok', matchCount: count ?? 0 });
      }
    })();
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={<ThemedView />}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Bolzify</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">DB-Status</ThemedText>
        {db.state === 'loading' && <ThemedText>Prüfe Verbindung…</ThemedText>}
        {db.state === 'ok' && (
          <ThemedText>✓ verbunden · {db.matchCount} Matches in DB</ThemedText>
        )}
        {db.state === 'error' && (
          <ThemedText>✗ Fehler: {db.message}</ThemedText>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
});
