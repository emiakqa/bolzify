import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { Button } from '@/components/ui/button';
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
import { formatKickoffDate, formatKickoffTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Row = {
  matchId: number;
  kickoff_at: string;
  home_team: string;
  away_team: string;
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

  const [sections, setSections] = useState<Section[]>([]);
  // Summe aller scored_special_tips.total_points über alle Turniere des Users.
  // Wird zum Match-Punkte-Total addiert.
  const [specialPoints, setSpecialPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dep auf user.id (Primitive), nicht user (Objekt) — sonst reloaded
  // bei jedem Supabase-Session-Refresh.
  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    if (!userId) {
      setSections([]);
      setSpecialPoints(0);
      setLoading(false);
      return;
    }

    // Aktuelles Turnier resolven — wir zeigen nur Tipps des laufenden Turniers.
    const tournament = await getCurrentTournament();

    // Sondertipp-Summe nur für das aktive Turnier — sonst würden Sondertipps
    // aus alten Turnieren in die Header-Punktzahl wandern.
    const specialPromise = supabase
      .from('scored_special_tips')
      .select('total_points')
      .eq('user_id', userId)
      .eq('tournament', tournament);

    // Alle eigenen Tipps holen — gefiltert wird gleich serverseitig per
    // Match-Tournament (Matches dieses Turniers IN tipIds).
    const { data: tipRows } = await supabase
      .from('tips')
      .select('match_id, home_goals, away_goals, first_scorer_id')
      .eq('user_id', userId);

    const { data: specialRows } = await specialPromise;
    const specialTotal = (specialRows ?? []).reduce(
      (sum, r) => sum + (r.total_points ?? 0),
      0,
    );
    setSpecialPoints(specialTotal);

    if (!tipRows || tipRows.length === 0) {
      setSections([]);
      setLoading(false);
      return;
    }

    const matchIds = tipRows.map((t) => t.match_id);
    const scorerIds = tipRows
      .map((t) => t.first_scorer_id)
      .filter((id): id is number => id !== null);

    const [{ data: matchRows }, { data: scoredRows }, playersRes] = await Promise.all([
      supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, status, home_goals, away_goals')
        .eq('tournament', tournament)
        .in('id', matchIds),
      supabase
        .from('scored_tips')
        .select('match_id, total_points')
        .eq('user_id', userId)
        .in('match_id', matchIds),
      scorerIds.length > 0
        ? supabase.from('players').select('id, name').in('id', scorerIds)
        : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    ]);

    const matchMap = new Map(matchRows?.map((m) => [m.id, m]) ?? []);
    const pointsMap = new Map(scoredRows?.map((s) => [s.match_id, s.total_points]) ?? []);
    const playerMap = new Map((playersRes.data ?? []).map((p) => [p.id, p.name]));

    const rows: Row[] = tipRows
      .map((t): Row | null => {
        const m = matchMap.get(t.match_id);
        if (!m) return null;
        return {
          matchId: m.id,
          kickoff_at: m.kickoff_at,
          home_team: m.home_team,
          away_team: m.away_team,
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
    if (open.length > 0) next.push({ title: 'Offen', data: open });
    if (finished.length > 0) next.push({ title: 'Gespielt', data: finished });
    setSections(next);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  // Gesamtpunkte-Badge im Header: gescorde Match-Tipps + Sondertipps.
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
              <ThemedText style={[styles.h1, { color: c.text }]}>Meine Tipps</ThemedText>
              {totalPoints > 0 ? <Badge label={`${totalPoints} Pkt`} tone="accent" /> : null}
            </View>
            {/* Aufschlüsselung nur zeigen wenn beide Quellen Punkte beigesteuert
                haben — sonst ist die Summe = Match-Punkte und der Subtitle
                wäre redundant. */}
            {specialPoints > 0 && matchPoints > 0 ? (
              <ThemedText
                style={{
                  color: c.textMuted,
                  fontSize: FontSize.sm,
                  lineHeight: LineHeight.sm,
                  fontFamily: Fonts?.rounded,
                  marginTop: -Spacing.sm,
                  marginBottom: Spacing.lg,
                }}>
                {matchPoints} aus Spielen · {specialPoints} aus Sondertipps
              </ThemedText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Card padding="xl" style={styles.emptyCard}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                textAlign: 'center',
                fontFamily: Fonts?.rounded,
              }}>
              Du hast noch keinen Tipp abgegeben.
            </ThemedText>
            <Button
              label="Zum Spielplan"
              onPress={() => router.push('/(tabs)/matches')}
              style={{ alignSelf: 'center' }}
            />
          </Card>
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
        renderItem={({ item }) => (
          <Card
            padding="md"
            style={styles.cardSpacing}
            onPress={() =>
              router.push({
                pathname: '/tip/[matchId]',
                params: { matchId: String(item.matchId) },
              })
            }>
            <View style={styles.rowHeader}>
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
              {item.points !== null ? (
                <ThemedText
                  style={{
                    color: item.points > 0 ? c.accent : c.textFaint,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                    fontFamily: Fonts?.rounded,
                    fontWeight: FontWeight.bold,
                  }}>
                  +{item.points} Pkt
                </ThemedText>
              ) : item.is_finished ? (
                <ThemedText
                  style={{
                    color: c.textFaint,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                  }}>
                  —
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.rowTeams}>
              <ThemedText style={[styles.team, { color: c.text }]} numberOfLines={1}>
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
              <ThemedText style={[styles.team, { color: c.text }]} numberOfLines={1}>
                {deName(item.away_team)}
              </ThemedText>
            </View>

            <View style={styles.rowFooter}>
              <Badge label={`Tipp ${item.tip_home}:${item.tip_away}`} tone="accent" />
              {item.scorer_name ? (
                <ThemedText
                  style={{
                    color: c.textMuted,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                    fontFamily: Fonts?.rounded,
                    flex: 1,
                  }}
                  numberOfLines={1}>
                  ⚽ {item.scorer_name}
                </ThemedText>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              {item.is_finished && item.home_goals !== null && item.away_goals !== null ? (
                <ThemedText
                  style={{
                    color: c.text,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                    fontFamily: Fonts?.rounded,
                    fontWeight: FontWeight.semibold,
                  }}>
                  Endstand {item.home_goals}:{item.away_goals}
                </ThemedText>
              ) : null}
            </View>
          </Card>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  h1: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    flex: 1,
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
    gap: Spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  team: {
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontFamily: Fonts?.rounded,
    fontWeight: FontWeight.semibold,
    flexShrink: 1,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
