import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setSections([]);
      setLoading(false);
      return;
    }

    // Alle eigenen Tipps + per IN-Filter Matches + scored_tips + Spielernamen.
    const { data: tipRows } = await supabase
      .from('tips')
      .select('match_id, home_goals, away_goals, first_scorer_id')
      .eq('user_id', user.id);

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
        .in('id', matchIds),
      supabase
        .from('scored_tips')
        .select('match_id, total_points')
        .eq('user_id', user.id)
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
  }, [user]);

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

  // Gesamtpunkte-Badge im Header (nur gescorde Tipps).
  const totalPoints = sections
    .flatMap((s) => s.data)
    .reduce((sum, r) => sum + (r.points ?? 0), 0);

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
          <View style={styles.headerRow}>
            <ThemedText style={[styles.h1, { color: c.text }]}>Meine Tipps</ThemedText>
            {totalPoints > 0 ? (
              <View style={[styles.totalBadge, { borderColor: c.accent }]}>
                <ThemedText
                  style={{
                    color: c.accent,
                    fontSize: FontSize.sm,
                    fontWeight: FontWeight.bold,
                  }}>
                  {totalPoints} Pkt
                </ThemedText>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
              Du hast noch keinen Tipp abgegeben.{'\n'}Geh zum Spielplan und leg los.
            </ThemedText>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
            <ThemedText style={[styles.sectionHeaderText, { color: c.nostalgia }]}>
              {section.title}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/tip/[matchId]',
                params: { matchId: String(item.matchId) },
              })
            }
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <View style={styles.rowHeader}>
              <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs }}>
                {formatKickoffDate(item.kickoff_at)} · {formatKickoffTime(item.kickoff_at)}
              </ThemedText>
              {item.points !== null ? (
                <ThemedText
                  style={{
                    color: item.points > 0 ? c.accent : c.textFaint,
                    fontSize: FontSize.xs,
                    fontWeight: FontWeight.bold,
                  }}>
                  +{item.points} Pkt
                </ThemedText>
              ) : item.is_finished ? (
                <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>—</ThemedText>
              ) : null}
            </View>

            <View style={styles.rowTeams}>
              <ThemedText style={[styles.team, { color: c.text }]} numberOfLines={1}>
                {item.home_team}
              </ThemedText>
              <ThemedText style={{ color: c.textFaint, fontSize: FontSize.sm }}>vs</ThemedText>
              <ThemedText style={[styles.team, { color: c.text }]} numberOfLines={1}>
                {item.away_team}
              </ThemedText>
            </View>

            <View style={styles.rowFooter}>
              <View style={[styles.tipPill, { borderColor: c.accent }]}>
                <ThemedText
                  style={{
                    color: c.accent,
                    fontSize: FontSize.xs,
                    fontWeight: FontWeight.semibold,
                  }}>
                  Tipp {item.tip_home}:{item.tip_away}
                </ThemedText>
              </View>
              {item.scorer_name ? (
                <ThemedText
                  style={{ color: c.textMuted, fontSize: FontSize.xs, flex: 1 }}
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
                    fontWeight: FontWeight.semibold,
                  }}>
                  Endstand {item.home_goals}:{item.away_goals}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        )}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  h1: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  totalBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  empty: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.xl,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
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
  },
  team: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flexShrink: 1,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  tipPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
