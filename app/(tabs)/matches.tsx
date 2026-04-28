import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/lib/auth';
import { deName } from '@/lib/country-names';
import { getCurrentTournament } from '@/lib/current-tournament';
import { formatKickoffDate, formatKickoffTime, isBeforeKickoff } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Match = {
  id: number;
  tournament: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
};

const LIVE_TOURNAMENT = 'WM2026';

type Tip = {
  match_id: number;
  home_goals: number;
  away_goals: number;
  points: number | null;
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

  // Dep auf user.id (Primitive), nicht user (Objekt) — sonst reloaded
  // bei jedem Supabase-Session-Refresh.
  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    // Nur Matches des aktuell aktiven Turniers.
    const tournament = await getCurrentTournament();
    const { data } = await supabase
      .from('matches')
      .select('id, tournament, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
      .eq('tournament', tournament)
      .order('kickoff_at', { ascending: true });
    setMatches(data ?? []);

    if (userId) {
      // Tips ebenfalls auf das aktive Turnier beschränken — wir matchen
      // im Frontend per match_id.in(...), damit die DB-Query indexfreundlich
      // bleibt (RLS auf user_id + Index auf match_id).
      const matchIds = (data ?? []).map((m) => m.id);
      const [{ data: tipData }, { data: scoredData }] = await Promise.all([
        matchIds.length > 0
          ? supabase
              .from('tips')
              .select('match_id, home_goals, away_goals')
              .eq('user_id', userId)
              .in('match_id', matchIds)
          : Promise.resolve({ data: [] as { match_id: number; home_goals: number; away_goals: number }[] }),
        matchIds.length > 0
          ? supabase
              .from('scored_tips')
              .select('match_id, total_points')
              .eq('user_id', userId)
              .in('match_id', matchIds)
          : Promise.resolve({ data: [] as { match_id: number; total_points: number | null }[] }),
      ]);
      const pointsByMatch = new Map<number, number>();
      for (const s of scoredData ?? []) pointsByMatch.set(s.match_id, s.total_points ?? 0);

      const map = new Map<number, Tip>();
      for (const t of tipData ?? []) {
        map.set(t.match_id, { ...t, points: pointsByMatch.get(t.match_id) ?? null });
      }
      setTips(map);
    }
    setLoading(false);
  }, [userId]);

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
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.xs,
                fontWeight: FontWeight.bold,
                fontFamily: Fonts?.rounded,
                textTransform: 'uppercase',
                letterSpacing: LetterSpacing.label,
              }}>
              {section.title}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => {
          const tip = tips.get(item.id);
          const tippable =
            item.tournament !== LIVE_TOURNAMENT || isBeforeKickoff(item.kickoff_at);
          const isFinished =
            item.status === 'finished' && item.home_goals !== null && item.away_goals !== null;
          return (
            <Card
              padding="md"
              style={styles.cardSpacing}
              onPress={() =>
                router.push({ pathname: '/tip/[matchId]', params: { matchId: String(item.id) } })
              }>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <ThemedText
                    style={{
                      color: c.textMuted,
                      fontSize: FontSize.xs,
                      lineHeight: LineHeight.xs,
                      fontFamily: Fonts?.rounded,
                      fontWeight: FontWeight.medium,
                    }}>
                    {formatKickoffDate(item.kickoff_at)} · {formatKickoffTime(item.kickoff_at)}
                  </ThemedText>
                  <View style={styles.rowTeams}>
                    <ThemedText
                      style={[styles.rowTeam, { color: c.text }]}
                      numberOfLines={1}>
                      {deName(item.home_team)}
                    </ThemedText>
                    <ThemedText
                      style={{
                        color: c.textFaint,
                        fontSize: FontSize.sm,
                        lineHeight: LineHeight.sm,
                        fontFamily: Fonts?.rounded,
                      }}>
                      vs
                    </ThemedText>
                    <ThemedText
                      style={[styles.rowTeam, { color: c.text }]}
                      numberOfLines={1}>
                      {deName(item.away_team)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  {isFinished ? (
                    <ThemedText
                      style={{
                        color: c.text,
                        fontSize: FontSize.lg,
                        lineHeight: LineHeight.lg,
                        fontFamily: Fonts?.rounded,
                        fontWeight: FontWeight.bold,
                      }}>
                      {item.home_goals}:{item.away_goals}
                    </ThemedText>
                  ) : null}
                  {tip ? (
                    <View style={styles.tipStack}>
                      <Badge label={`${tip.home_goals}:${tip.away_goals}`} tone="accent" />
                      {tip.points !== null ? (
                        <ThemedText
                          style={{
                            color: tip.points > 0 ? c.accent : c.textFaint,
                            fontSize: FontSize.xs,
                            lineHeight: LineHeight.xs,
                            fontFamily: Fonts?.rounded,
                            fontWeight: FontWeight.bold,
                          }}>
                          +{tip.points} Pkt
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : tippable ? (
                    <Badge label="tippen" tone="neutral" />
                  ) : (
                    <ThemedText
                      style={{
                        color: c.textFaint,
                        fontSize: FontSize.xs,
                        lineHeight: LineHeight.xs,
                      }}>
                      —
                    </ThemedText>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h1: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  cardSpacing: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
    lineHeight: LineHeight.md,
    fontFamily: Fonts?.rounded,
    fontWeight: FontWeight.semibold,
    flexShrink: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  tipStack: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
