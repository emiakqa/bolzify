import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type LeagueRow = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  member_count: number;
};

export default function LeaguesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dep auf user.id (Primitive), nicht user (Objekt) — sonst reloaded
  // bei jedem Supabase-Session-Refresh.
  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    if (!userId) return;

    // Alle Ligen, in denen ich Member bin. RLS sorgt dafür, dass ich nur
    // die sehe, wo ich drin bin — kein zusätzlicher Filter nötig.
    const { data: memberRows, error: memErr } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', userId);

    if (memErr) {
      console.warn('leagues load error:', memErr.message);
      setLeagues([]);
      setLoading(false);
      return;
    }

    const ids = (memberRows ?? []).map((r) => r.league_id);
    if (ids.length === 0) {
      setLeagues([]);
      setLoading(false);
      return;
    }

    const { data: leagueRows, error: lgErr } = await supabase
      .from('leagues')
      .select('id, name, invite_code, created_by')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (lgErr) {
      console.warn('leagues select error:', lgErr.message);
      setLeagues([]);
      setLoading(false);
      return;
    }

    // Member-Counts in einem Batch holen
    const { data: counts } = await supabase
      .from('league_members')
      .select('league_id')
      .in('league_id', ids);
    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.league_id, (countMap.get(row.league_id) ?? 0) + 1);
    }

    setLeagues(
      (leagueRows ?? []).map((l) => ({
        ...l,
        member_count: countMap.get(l.id) ?? 1,
      })),
    );
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />}>
        <ThemedText style={[styles.title, { color: c.text }]}>Ligen</ThemedText>

        <View style={styles.ctaRow}>
          <Pressable
            onPress={() => router.push('/leagues-new')}
            style={({ pressed }) => [
              styles.ctaPrimary,
              { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={{ color: c.accentFg, fontWeight: FontWeight.semibold, fontSize: FontSize.md }}>
              + Erstellen
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/leagues-join')}
            style={({ pressed }) => [
              styles.ctaSecondary,
              { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={{ color: c.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md }}>
              Beitreten
            </ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ActivityIndicator color={c.textMuted} />
          </View>
        ) : leagues.length === 0 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border, alignItems: 'center', gap: Spacing.md },
            ]}>
            <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
              Noch keine Liga.{'\n'}Nutze die Buttons oben, um zu starten.
            </ThemedText>
          </View>
        ) : (
          leagues.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push({ pathname: '/leagues/[id]', params: { id: l.id } })}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: c.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold }}>
                  {l.name}
                </ThemedText>
                <ThemedText style={{ color: c.textMuted, fontSize: FontSize.sm, marginTop: 2 }}>
                  {l.member_count} {l.member_count === 1 ? 'Mitglied' : 'Mitglieder'} · Code {l.invite_code}
                </ThemedText>
              </View>
              <ThemedText style={{ color: c.textFaint, fontSize: FontSize.lg }}>›</ThemedText>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  ctaRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  ctaPrimary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  ctaSecondary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  row: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
