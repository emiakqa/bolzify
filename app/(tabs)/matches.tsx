import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { formatKickoffDate, formatKickoffTime, isBeforeKickoff } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Match = {
  id: number;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
};

type Tip = {
  match_id: number;
  home_goals: number;
  away_goals: number;
};

type Section = { title: string; data: Match[] };

// Stage-Strings von api-football normalisieren & sortieren.
// Beispiele: "Group A - 1", "Round of 16", "Quarter-finals", "Semi-finals", "Final".
function stageKey(stage: string | null): { group: string; order: number } {
  const s = (stage ?? 'Sonstige').trim();
  if (/^Group\s+([A-H])/i.test(s)) {
    const letter = s.match(/^Group\s+([A-H])/i)![1].toUpperCase();
    return { group: `Gruppe ${letter}`, order: 100 + letter.charCodeAt(0) };
  }
  if (/Round of 16/i.test(s)) return { group: 'Achtelfinale', order: 200 };
  if (/Quarter-?finals?/i.test(s)) return { group: 'Viertelfinale', order: 300 };
  if (/Semi-?finals?/i.test(s)) return { group: 'Halbfinale', order: 400 };
  if (/3rd Place|Third Place/i.test(s)) return { group: 'Spiel um Platz 3', order: 500 };
  if (/^Final/i.test(s)) return { group: 'Finale', order: 600 };
  return { group: s, order: 999 };
}

export default function MatchesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [matches, setMatches] = useState<Match[]>([]);
  const [tips, setTips] = useState<Map<number, Tip>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
      .order('kickoff_at', { ascending: true });
    setMatches(data ?? []);

    if (user) {
      const { data: tipData } = await supabase
        .from('tips')
        .select('match_id, home_goals, away_goals')
        .eq('user_id', user.id);
      const map = new Map<number, Tip>();
      for (const t of tipData ?? []) map.set(t.match_id, t);
      setTips(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo<Section[]>(() => {
    const groups = new Map<string, { order: number; data: Match[] }>();
    for (const m of matches) {
      const { group, order } = stageKey(m.stage);
      if (!groups.has(group)) groups.set(group, { order, data: [] });
      groups.get(group)!.data.push(m);
    }
    return Array.from(groups.entries())
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([title, v]) => ({ title, data: v.data }));
  }, [matches]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />}
        ListHeaderComponent={
          <ThemedText style={[styles.h1, { color: c.text }]}>Spielplan</ThemedText>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
            <ThemedText style={[styles.sectionHeaderText, { color: c.nostalgia }]}>
              {section.title}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => {
          const tip = tips.get(item.id);
          const tippable = isBeforeKickoff(item.kickoff_at);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/tip/[matchId]', params: { matchId: String(item.id) } })}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={styles.rowLeft}>
                <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs }}>
                  {formatKickoffDate(item.kickoff_at)} · {formatKickoffTime(item.kickoff_at)}
                </ThemedText>
                <View style={styles.rowTeams}>
                  <ThemedText style={[styles.rowTeam, { color: c.text }]} numberOfLines={1}>
                    {item.home_team}
                  </ThemedText>
                  <ThemedText style={{ color: c.textFaint, fontSize: FontSize.sm }}>vs</ThemedText>
                  <ThemedText style={[styles.rowTeam, { color: c.text }]} numberOfLines={1}>
                    {item.away_team}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.rowRight}>
                {item.status === 'finished' && item.home_goals !== null && item.away_goals !== null ? (
                  <ThemedText style={[styles.resultBadge, { color: c.textMuted }]}>
                    {item.home_goals}:{item.away_goals}
                  </ThemedText>
                ) : null}
                {tip ? (
                  <View style={[styles.tipPill, { borderColor: c.accent }]}>
                    <ThemedText style={{ color: c.accent, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
                      {tip.home_goals}:{tip.away_goals}
                    </ThemedText>
                  </View>
                ) : tippable ? (
                  <View style={[styles.tipPill, { borderColor: c.textFaint }]}>
                    <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>tippen</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>—</ThemedText>
                )}
              </View>
            </Pressable>
          );
        }}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h1: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  rowLeft: { flex: 1, gap: 4 },
  rowTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowTeam: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flexShrink: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  resultBadge: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tipPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
