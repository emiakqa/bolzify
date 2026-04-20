import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type DbStatus =
  | { state: 'loading' }
  | { state: 'ok'; matchCount: number }
  | { state: 'error'; message: string };

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
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

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Eingeloggt als</ThemedText>
        <ThemedText>{profile?.username ?? '—'}</ThemedText>
        <ThemedText style={styles.muted}>{user?.email ?? ''}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">DB-Status</ThemedText>
        {db.state === 'loading' && <ThemedText>Prüfe Verbindung…</ThemedText>}
        {db.state === 'ok' && (
          <ThemedText>✓ verbunden · {db.matchCount} Matches in DB</ThemedText>
        )}
        {db.state === 'error' && (
          <ThemedText>✗ Fehler: {db.message}</ThemedText>
        )}
      </ThemedView>

      <Pressable style={styles.signOutBtn} onPress={signOut}>
        <ThemedText style={styles.signOutText}>Abmelden</ThemedText>
      </Pressable>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  section: {
    gap: 4,
    marginBottom: 12,
  },
  muted: { opacity: 0.6, fontSize: 12 },
  signOutBtn: {
    marginTop: 24,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#888',
  },
  signOutText: { fontWeight: '600' },
});
