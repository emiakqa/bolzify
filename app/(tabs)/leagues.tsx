import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  Colors,
  FontSize,
  FontWeight,
  Fonts,
  LetterSpacing,
  LineHeight,
  Radius,
  Spacing,
} from '@/constants/design';
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }>
        <ThemedText style={[styles.title, { color: c.text }]}>Ligen</ThemedText>

        <View style={styles.ctaRow}>
          <Button
            label="Erstellen"
            onPress={() => router.push('/leagues-new')}
            fullWidth
            style={{ flex: 1 }}
          />
          <Button
            label="Beitreten"
            variant="secondary"
            onPress={() => router.push('/leagues-join')}
            fullWidth
            style={{ flex: 1 }}
          />
        </View>

        {loading ? (
          <Card>
            <ActivityIndicator color={c.textMuted} />
          </Card>
        ) : leagues.length === 0 ? (
          <Card padding="xl" style={styles.emptyCard}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                textAlign: 'center',
              }}>
              Noch keine Liga.{'\n'}Nutze die Buttons oben, um zu starten.
            </ThemedText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {leagues.map((l) => (
              <Card
                key={l.id}
                padding="md"
                onPress={() =>
                  router.push({ pathname: '/leagues/[id]', params: { id: l.id } })
                }>
                <View style={styles.row}>
                  <View style={[styles.iconSquare, { backgroundColor: c.accentSoft }]}>
                    <IconSymbol name="person.3.fill" size={18} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={{
                        color: c.text,
                        fontSize: FontSize.md,
                        lineHeight: LineHeight.md,
                        fontFamily: Fonts?.rounded,
                        fontWeight: FontWeight.semibold,
                      }}>
                      {l.name}
                    </ThemedText>
                    <View style={styles.metaRow}>
                      <ThemedText
                        style={{
                          color: c.textMuted,
                          fontSize: FontSize.sm,
                          lineHeight: LineHeight.sm,
                          fontFamily: Fonts?.rounded,
                        }}>
                        {l.member_count}{' '}
                        {l.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
                      </ThemedText>
                      <Badge label={l.invite_code} tone="neutral" />
                    </View>
                  </View>
                  <ThemedText
                    style={{
                      color: c.textFaint,
                      fontSize: FontSize.xl,
                      lineHeight: LineHeight.xl,
                      fontFamily: Fonts?.rounded,
                    }}>
                    ›
                  </ThemedText>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo, gap: Spacing.md },
  title: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    marginBottom: Spacing.sm,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
});
