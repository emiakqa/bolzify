import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeaguePickerBar } from '@/components/league-picker-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorCard } from '@/components/ui/error-card';
import { TeamFlag } from '@/components/ui/team-flag';
import {
  Colors,
  Fonts,
  LetterSpacing,
  Radius,
  Spacing,
} from '@/constants/design';
import { useActiveLeague } from '@/hooks/use-active-league';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { deName } from '@/lib/country-names';
import { getCurrentTournament } from '@/lib/current-tournament';
import { formatKickoffDate, formatKickoffTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Row = {
  matchId: number;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_logo: string | null;
  away_logo: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  tip_home: number;
  tip_away: number;
  scorer_name: string | null;
  points: number | null;
  is_finished: boolean;
};

type Section = { title: string; data: Row[] };

export default function MyTipsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const { leagues, activeLeagueId, setActive } = useActiveLeague();

  const [sections, setSections] = useState<Section[]>([]);
  const [specialPoints, setSpecialPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    if (!userId || !activeLeagueId) {
      setSections([]);
      setSpecialPoints(0);
      setLoading(false);
      return;
    }
    setError(null);
    try {
    const tournament = await getCurrentTournament();

    // Sondertipp-Punkte aus AKTIVER Liga (per-Liga seit 0016).
    const specialPromise = supabase
      .from('scored_special_tips')
      .select('total_points')
      .eq('user_id', userId)
      .eq('tournament', tournament)
      .eq('league_id', activeLeagueId);

    const { data: tipRows } = await supabase
      .from('tips')
      .select('match_id, home_goals, away_goals, first_scorer_id')
      .eq('user_id', userId)
      .eq('league_id', activeLeagueId);

    const { data: specialRows } = await specialPromise;
    const specialTotal = (specialRows ?? []).reduce(
      (sum, r) => sum + (r.total_points ?? 0),
      0,
    );
    setSpecialPoints(specialTotal);

    if (!tipRows || tipRows.length === 0) {
      setSections([]);
      return;
    }

    const matchIds = tipRows.map((t) => t.match_id);
    const scorerIds = tipRows
      .map((t) => t.first_scorer_id)
      .filter((id): id is number => id !== null);

    const [{ data: matchRows }, { data: scoredRows }, playersRes] = await Promise.all([
      supabase
        .from('matches')
        .select(
          'id, kickoff_at, home_team, away_team, home_team_id, away_team_id, status, home_goals, away_goals',
        )
        .eq('tournament', tournament)
        .in('id', matchIds),
      supabase
        .from('scored_tips')
        .select('match_id, total_points')
        .eq('user_id', userId)
        .eq('league_id', activeLeagueId)
        .in('match_id', matchIds),
      scorerIds.length > 0
        ? supabase.from('players').select('id, name').in('id', scorerIds)
        : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    ]);

    const matchMap = new Map(matchRows?.map((m) => [m.id, m]) ?? []);
    const pointsMap = new Map(scoredRows?.map((s) => [s.match_id, s.total_points]) ?? []);
    const playerMap = new Map((playersRes.data ?? []).map((p) => [p.id, p.name]));

    // Team-Logos batch
    const teamIds = Array.from(
      new Set(
        (matchRows ?? [])
          .flatMap((m) => [m.home_team_id, m.away_team_id])
          .filter((id): id is number => id !== null),
      ),
    );
    const logoMap = new Map<number, string>();
    if (teamIds.length > 0) {
      const { data: teamRows } = await supabase
        .from('teams')
        .select('id, logo_url')
        .in('id', teamIds);
      for (const t of teamRows ?? []) if (t.logo_url) logoMap.set(t.id, t.logo_url);
    }

    const rows: Row[] = tipRows
      .map((t): Row | null => {
        const m = matchMap.get(t.match_id);
        if (!m) return null;
        return {
          matchId: m.id,
          kickoff_at: m.kickoff_at,
          home_team: m.home_team,
          away_team: m.away_team,
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_logo: m.home_team_id ? logoMap.get(m.home_team_id) ?? null : null,
          away_logo: m.away_team_id ? logoMap.get(m.away_team_id) ?? null : null,
          status: m.status,
          home_goals: m.home_goals,
          away_goals: m.away_goals,
          tip_home: t.home_goals,
          tip_away: t.away_goals,
          scorer_name:
            t.first_scorer_id !== null ? (playerMap.get(t.first_scorer_id) ?? null) : null,
          points: pointsMap.get(t.match_id) ?? null,
          is_finished: m.status === 'finished',
        };
      })
      .filter((r): r is Row => r !== null);

    const open = rows
      .filter((r) => !r.is_finished)
      .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
    const finished = rows
      .filter((r) => r.is_finished)
      .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));

    const next: Section[] = [];
    if (open.length > 0) next.push({ title: `Offen · ${open.length}`, data: open });
    if (finished.length > 0) next.push({ title: `Gespielt · ${finished.length}`, data: finished });
    setSections(next);
    } catch (err) {
      console.error('[my-tips] load failed', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [userId, activeLeagueId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (error && sections.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={[styles.scroll]}>
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

  // Keine Liga → kein Tipp-Verlauf möglich (Tipps sind per-Liga seit 0016).
  if (leagues.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.scroll}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: Fonts.mono.bold,
              fontSize: 11,
              letterSpacing: LetterSpacing.label,
              textTransform: 'uppercase',
            }}>
            Saison · WM 2026
          </Text>
          <Text
            style={{
              color: c.text,
              fontSize: 32,
              lineHeight: 38,
              fontFamily: Fonts.display.bold,
              letterSpacing: -1,
              marginTop: 4,
              marginBottom: Spacing.lg,
            }}>
            Meine Tipps
          </Text>
          <Card padding="xl" style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: c.text,
                fontFamily: Fonts.display.bold,
                fontSize: 18,
                letterSpacing: -0.3,
                textAlign: 'center',
                marginBottom: Spacing.sm,
              }}>
              Noch keine Liga.
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 14,
                lineHeight: 21,
                textAlign: 'center',
                marginBottom: Spacing.lg,
              }}>
              Tipps gibt&apos;s pro Liga — leg eine an oder tritt per Code bei.
            </Text>
            <Button
              label="Zu den Ligen"
              onPress={() => router.push('/(tabs)/leagues')}
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const matchPoints = sections
    .flatMap((s) => s.data)
    .reduce((sum, r) => sum + (r.points ?? 0), 0);
  const totalPoints = matchPoints + specialPoints;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.matchId)}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }
        ListHeaderComponent={
          <View>
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
                  Saison · WM 2026
                </Text>
                <Text
                  style={{
                    color: c.text,
                    fontSize: 32,
                    lineHeight: 38,
                    fontFamily: Fonts.display.bold,
                    letterSpacing: -1,
                    marginTop: 4,
                  }}>
                  Meine Tipps
                </Text>
              </View>
              {totalPoints > 0 ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: c.accent,
                      fontFamily: Fonts.display.bold,
                      fontSize: 36,
                      letterSpacing: -1,
                      lineHeight: 38,
                    }}>
                    {totalPoints}
                  </Text>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: Fonts.mono.bold,
                      fontSize: 10,
                      letterSpacing: 0.6,
                      marginTop: 2,
                    }}>
                    PUNKTE
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ marginBottom: Spacing.md }}>
              <LeaguePickerBar
                leagues={leagues}
                activeId={activeLeagueId}
                onSelect={setActive}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Card padding="xl" style={styles.emptyCard}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 15,
                lineHeight: 22,
                textAlign: 'center',
              }}>
              Du hast noch keinen Tipp abgegeben.
            </Text>
            <Button
              label="Zum Spielplan"
              onPress={() => router.push('/(tabs)/matches')}
              style={{ alignSelf: 'center' }}
            />
          </Card>
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
        renderItem={({ item }) =>
          item.is_finished ? (
            <FinishedTipCard item={item} c={c} onPress={() =>
              router.push({
                pathname: '/tip/[matchId]',
                params: {
                  matchId: String(item.matchId),
                  ...(activeLeagueId ? { leagueId: activeLeagueId } : {}),
                },
              })
            } />
          ) : (
            <OpenTipCard item={item} c={c} onPress={() =>
              router.push({
                pathname: '/tip/[matchId]',
                params: {
                  matchId: String(item.matchId),
                  ...(activeLeagueId ? { leagueId: activeLeagueId } : {}),
                },
              })
            } />
          )
        }
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}

function OpenTipCard({
  item,
  c,
  onPress,
}: {
  item: Row;
  c: (typeof Colors)['light'];
  onPress: () => void;
}) {
  return (
    <Card padding="md" style={styles.cardSpacing} onPress={onPress}>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: Fonts.mono.semibold,
          fontSize: 10,
          letterSpacing: 0.6,
          marginBottom: 6,
        }}>
        {formatKickoffDate(item.kickoff_at).toUpperCase()} · {formatKickoffTime(item.kickoff_at)}
      </Text>
      <View style={styles.rowTeamsCompact}>
        <TeamFlag logoUrl={item.home_logo} size={26} radius={6} />
        <Text
          style={{ color: c.text, fontFamily: Fonts.display.bold, fontSize: 15, letterSpacing: -0.3 }}
          numberOfLines={1}>
          {deName(item.home_team)}
        </Text>
        <Text style={{ color: c.textFaint, fontSize: 12, fontFamily: Fonts.mono.regular }}>vs</Text>
        <TeamFlag logoUrl={item.away_logo} size={26} radius={6} />
        <Text
          style={{ color: c.text, fontFamily: Fonts.display.bold, fontSize: 15, letterSpacing: -0.3 }}
          numberOfLines={1}>
          {deName(item.away_team)}
        </Text>
      </View>
      <View style={styles.rowFooter}>
        <Badge label={`Tipp ${item.tip_home}:${item.tip_away}`} tone="accent" />
        {item.scorer_name ? (
          <Text
            style={{
              color: c.textMuted,
              fontFamily: Fonts.mono.semibold,
              fontSize: 11,
              letterSpacing: 0.3,
              flex: 1,
            }}
            numberOfLines={1}>
            ⚽ {item.scorer_name}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function FinishedTipCard({
  item,
  c,
  onPress,
}: {
  item: Row;
  c: (typeof Colors)['light'];
  onPress: () => void;
}) {
  const exact =
    item.home_goals !== null &&
    item.away_goals !== null &&
    item.tip_home === item.home_goals &&
    item.tip_away === item.away_goals;
  const points = item.points ?? 0;

  return (
    <Card padding="md" style={styles.cardSpacing} onPress={onPress}>
      <View style={styles.rowDate}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: Fonts.mono.semibold,
            fontSize: 10,
            letterSpacing: 0.6,
          }}>
          {formatKickoffDate(item.kickoff_at).toUpperCase()} · {formatKickoffTime(item.kickoff_at)}
        </Text>
        <Text
          style={{
            color: points > 0 ? c.accent : c.textFaint,
            fontFamily: Fonts.mono.bold,
            fontSize: 10,
            letterSpacing: 0.6,
          }}>
          +{points} PKT
        </Text>
      </View>

      <View style={[styles.teamRow, { marginTop: 6 }]}>
        <TeamFlag logoUrl={item.home_logo} size={26} radius={6} />
        <Text
          style={{
            color: c.text,
            fontFamily: Fonts.display.bold,
            fontSize: 15,
            letterSpacing: -0.3,
            flex: 1,
          }}
          numberOfLines={1}>
          {deName(item.home_team)}
        </Text>
        <Text style={{ color: c.text, fontFamily: Fonts.display.bold, fontSize: 18 }}>
          {item.home_goals}
        </Text>
      </View>
      <View style={[styles.teamRow, { marginTop: 6, marginBottom: 10 }]}>
        <TeamFlag logoUrl={item.away_logo} size={26} radius={6} />
        <Text
          style={{
            color: c.text,
            fontFamily: Fonts.display.bold,
            fontSize: 15,
            letterSpacing: -0.3,
            flex: 1,
          }}
          numberOfLines={1}>
          {deName(item.away_team)}
        </Text>
        <Text style={{ color: c.text, fontFamily: Fonts.display.bold, fontSize: 18 }}>
          {item.away_goals}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: Radius.sm,
          backgroundColor: exact ? c.accentSoft : c.surfaceSunken,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <Text
          style={{
            color: exact ? c.accent : c.textMuted,
            fontFamily: Fonts.mono.semibold,
            fontSize: 11,
            letterSpacing: 0.4,
          }}>
          DEIN TIPP {item.tip_home}:{item.tip_away}
        </Text>
        <Text
          style={{
            color: exact ? c.accent : c.textMuted,
            fontFamily: Fonts.mono.semibold,
            fontSize: 11,
            letterSpacing: 0.4,
          }}>
          {exact ? '✓ EXAKT' : points > 0 ? '✓ TREFFER' : '✗ DANEBEN'}
        </Text>
      </View>
    </Card>
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
    gap: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  cardSpacing: {
    marginBottom: Spacing.sm,
  },
  rowTeamsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
