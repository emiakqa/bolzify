import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorCard } from '@/components/ui/error-card';
import { TeamFlag } from '@/components/ui/team-flag';
import {
  Colors,
  FontSize,
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
  home_team_id: number | null;
  away_team_id: number | null;
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
function stageKey(stage: string | null): { group: string; order: number } {
  const s = (stage ?? 'Sonstige').trim();
  if (/^Group\s+([A-L])/i.test(s)) {
    const letter = s.match(/^Group\s+([A-L])/i)![1].toUpperCase();
    return { group: `Gruppe ${letter}`, order: 100 + letter.charCodeAt(0) };
  }
  if (/Round of 32/i.test(s)) return { group: 'Sechzehntelfinale', order: 180 };
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
  const [logos, setLogos] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    setError(null);
    try {
    const tournament = await getCurrentTournament();
    const { data } = await supabase
      .from('matches')
      .select(
        'id, tournament, kickoff_at, home_team, away_team, home_team_id, away_team_id, stage, status, home_goals, away_goals',
      )
      .eq('tournament', tournament)
      .order('kickoff_at', { ascending: true });
    setMatches(data ?? []);

    // Team-Logos in einem Batch (alle eindeutigen Team-IDs aus den Matches)
    const teamIds = Array.from(
      new Set(
        (data ?? [])
          .flatMap((m) => [m.home_team_id, m.away_team_id])
          .filter((id): id is number => id !== null),
      ),
    );
    if (teamIds.length > 0) {
      const { data: teamRows } = await supabase
        .from('teams')
        .select('id, logo_url')
        .in('id', teamIds);
      const map = new Map<number, string>();
      for (const t of teamRows ?? []) if (t.logo_url) map.set(t.id, t.logo_url);
      setLogos(map);
    }

    if (userId) {
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
    } catch (err) {
      console.error('[matches] load failed', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
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

  const openCount = useMemo(
    () => matches.filter((m) => m.status !== 'finished' && !tips.has(m.id)).length,
    [matches, tips],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (error && matches.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={[styles.scroll, { paddingTop: Spacing.xxl }]}>
          <ErrorCard message={error} onRetry={load} />
        </View>
      </SafeAreaView>
    );
  }

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: Fonts.mono.bold,
                  fontSize: 11,
                  letterSpacing: LetterSpacing.label,
                  textTransform: 'uppercase',
                }}>
                WM 2026 · {matches.length} Spiele
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontSize: FontSize.xxl + 4,
                  lineHeight: LineHeight.xxl,
                  fontFamily: Fonts.display.bold,
                  letterSpacing: -1,
                  marginTop: 4,
                }}>
                Spielplan
              </Text>
            </View>
            {openCount > 0 ? (
              <Badge label={`${openCount} OFFEN`} tone="warm" />
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.mono.bold,
                fontSize: 11,
                letterSpacing: LetterSpacing.label,
                textTransform: 'uppercase',
              }}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const tip = tips.get(item.id);
          const tippable =
            item.tournament !== LIVE_TOURNAMENT || isBeforeKickoff(item.kickoff_at);
          const isFinished =
            item.status === 'finished' && item.home_goals !== null && item.away_goals !== null;
          const isLive = item.status === 'live';
          return (
            <Card
              padding="md"
              style={styles.cardSpacing}
              onPress={() =>
                router.push({ pathname: '/tip/[matchId]', params: { matchId: String(item.id) } })
              }>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.dateRow}>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: Fonts.mono.semibold,
                        fontSize: 10,
                        letterSpacing: 0.6,
                      }}>
                      {formatKickoffDate(item.kickoff_at).toUpperCase()} · {formatKickoffTime(item.kickoff_at)}
                    </Text>
                    {isLive ? (
                      <Text
                        style={{
                          color: c.warm,
                          fontFamily: Fonts.mono.bold,
                          fontSize: 10,
                          letterSpacing: 0.6,
                        }}>
                        ● LIVE
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rowTeams}>
                    <TeamFlag
                      logoUrl={item.home_team_id ? logos.get(item.home_team_id) : null}
                      size={26}
                      radius={6}
                    />
                    <Text
                      style={[
                        styles.rowTeam,
                        { color: c.text, fontFamily: Fonts.display.bold },
                      ]}
                      numberOfLines={1}>
                      {deName(item.home_team)}
                    </Text>
                    <Text
                      style={{
                        color: c.textFaint,
                        fontSize: 12,
                        fontFamily: Fonts.mono.regular,
                      }}>
                      vs
                    </Text>
                    <TeamFlag
                      logoUrl={item.away_team_id ? logos.get(item.away_team_id) : null}
                      size={26}
                      radius={6}
                    />
                    <Text
                      style={[
                        styles.rowTeam,
                        { color: c.text, fontFamily: Fonts.display.bold },
                      ]}
                      numberOfLines={1}>
                      {deName(item.away_team)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  {isFinished ? (
                    <Text
                      style={{
                        color: c.text,
                        fontSize: 18,
                        fontFamily: Fonts.display.bold,
                        letterSpacing: -0.3,
                      }}>
                      {item.home_goals}:{item.away_goals}
                    </Text>
                  ) : null}
                  {tip ? (
                    <View style={styles.tipStack}>
                      <Badge label={`${tip.home_goals}:${tip.away_goals}`} tone="accent" />
                      {tip.points !== null ? (
                        <Text
                          style={{
                            color: tip.points > 0 ? c.accent : c.textFaint,
                            fontSize: 10,
                            fontFamily: Fonts.mono.bold,
                            letterSpacing: 0.4,
                          }}>
                          +{tip.points} PKT
                        </Text>
                      ) : null}
                    </View>
                  ) : tippable ? (
                    <Badge label="tippen" tone="neutral" />
                  ) : (
                    <Text
                      style={{
                        color: c.textFaint,
                        fontSize: 12,
                        fontFamily: Fonts.mono.regular,
                      }}>
                      —
                    </Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowTeam: {
    fontSize: 15,
    letterSpacing: -0.3,
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
