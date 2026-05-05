import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorCard } from '@/components/ui/error-card';
import {
  Colors,
  Fonts,
  LetterSpacing,
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
  my_rank: number | null;
  my_points: number;
  leader_points: number | null;
  leader_username: string | null;
};

export default function LeaguesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {

    const { data: memberRows, error: memErr } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', userId);

    if (memErr) throw new Error(memErr.message);

    const ids = (memberRows ?? []).map((r) => r.league_id);
    if (ids.length === 0) {
      setLeagues([]);
      return;
    }

    const { data: leagueRows, error: lgErr } = await supabase
      .from('leagues')
      .select('id, name, invite_code, created_by')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (lgErr) throw new Error(lgErr.message);

    // Member-Counts
    const { data: counts } = await supabase
      .from('league_members')
      .select('league_id, user_id')
      .in('league_id', ids);
    const membersByLeague = new Map<string, string[]>();
    for (const row of counts ?? []) {
      const arr = membersByLeague.get(row.league_id) ?? [];
      arr.push(row.user_id);
      membersByLeague.set(row.league_id, arr);
    }

    // Punkte für alle relevanten User holen + Rankings rechnen
    const allUserIds = Array.from(new Set((counts ?? []).map((r) => r.user_id)));
    const pointsMap = new Map<string, number>();
    const usernameMap = new Map<string, string>();
    if (allUserIds.length > 0) {
      const [{ data: scored }, { data: scoredSpecial }, { data: profiles }] = await Promise.all([
        supabase.from('scored_tips').select('user_id, total_points').in('user_id', allUserIds),
        supabase
          .from('scored_special_tips')
          .select('user_id, total_points')
          .in('user_id', allUserIds),
        supabase.from('profiles').select('id, username').in('id', allUserIds),
      ]);
      for (const s of scored ?? [])
        pointsMap.set(s.user_id, (pointsMap.get(s.user_id) ?? 0) + (s.total_points ?? 0));
      for (const s of scoredSpecial ?? [])
        pointsMap.set(s.user_id, (pointsMap.get(s.user_id) ?? 0) + (s.total_points ?? 0));
      for (const p of profiles ?? []) usernameMap.set(p.id, p.username);
    }

    setLeagues(
      (leagueRows ?? []).map((l) => {
        const memberIds = membersByLeague.get(l.id) ?? [];
        const sorted = memberIds
          .map((uid) => ({ uid, pts: pointsMap.get(uid) ?? 0 }))
          .sort((a, b) => b.pts - a.pts);
        const myIdx = sorted.findIndex((r) => r.uid === userId);
        const myRank = myIdx >= 0 ? myIdx + 1 : null;
        const myPts = myIdx >= 0 ? sorted[myIdx].pts : 0;
        const leader = sorted[0] ?? null;
        return {
          ...l,
          member_count: memberIds.length,
          my_rank: myRank,
          my_points: myPts,
          leader_points: leader?.pts ?? null,
          leader_username: leader ? usernameMap.get(leader.uid) ?? null : null,
        };
      }),
    );
    } catch (err) {
      console.error('[leagues] load failed', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }>
        <Text
          style={{
            color: c.text,
            fontSize: 32,
            lineHeight: 38,
            fontFamily: Fonts.display.bold,
            letterSpacing: -1,
          }}>
          Ligen
        </Text>

        <View style={styles.ctaRow}>
          <Button
            label="+ Erstellen"
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

        {error && leagues.length === 0 ? (
          <ErrorCard message={error} onRetry={load} />
        ) : loading ? (
          <Card>
            <ActivityIndicator color={c.textMuted} />
          </Card>
        ) : leagues.length === 0 ? (
          <Card padding="xl" style={styles.emptyCard}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 14,
                lineHeight: 22,
                textAlign: 'center',
              }}>
              Noch keine Liga.{'\n'}Nutze die Buttons oben, um zu starten.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {leagues.map((l, i) => (
              <Card
                key={l.id}
                padding="md"
                onPress={() => router.push({ pathname: '/leagues/[id]', params: { id: l.id } })}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.iconSquare,
                      {
                        backgroundColor: i === 0 ? c.accent : c.accentSoft,
                      },
                    ]}>
                    <Text
                      style={{
                        color: i === 0 ? c.accentFg : c.accent,
                        fontFamily: Fonts.display.bold,
                        fontSize: 16,
                      }}>
                      {l.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: Fonts.display.bold,
                        fontSize: 16,
                        letterSpacing: -0.3,
                        marginBottom: 4,
                      }}>
                      {l.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: Fonts.mono.semibold,
                          fontSize: 11,
                          letterSpacing: 0.3,
                        }}>
                        #{l.invite_code}
                      </Text>
                      <Text style={{ color: c.textFaint, fontSize: 12 }}>·</Text>
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: Fonts.mono.semibold,
                          fontSize: 11,
                          letterSpacing: 0.3,
                          textTransform: 'uppercase',
                        }}>
                        {l.member_count} {l.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
                      </Text>
                    </View>
                  </View>
                  {l.my_rank !== null && l.my_points > 0 ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          color: l.my_rank <= 3 ? c.accent : c.text,
                          fontFamily: Fonts.display.bold,
                          fontSize: 22,
                          letterSpacing: -0.5,
                          lineHeight: 24,
                        }}>
                        #{l.my_rank}
                      </Text>
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: Fonts.mono.bold,
                          fontSize: 10,
                          letterSpacing: 0.6,
                        }}>
                        {l.my_points} PKT
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: c.textFaint, fontSize: 18 }}>›</Text>
                  )}
                </View>
                {/* Leader-Footer */}
                {l.leader_username && l.member_count > 1 && l.leader_points && l.leader_points > 0 ? (
                  <View
                    style={[styles.leaderFooter, { borderTopColor: c.divider }]}>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: Fonts.mono.semibold,
                        fontSize: 11,
                        letterSpacing: 0.3,
                        textTransform: 'uppercase',
                      }}>
                      👑 Leader · @{l.leader_username}
                    </Text>
                    {l.my_rank && l.my_rank > 1 && l.leader_points !== null ? (
                      <Text
                        style={{
                          color: c.warm,
                          fontFamily: Fonts.mono.bold,
                          fontSize: 11,
                          letterSpacing: LetterSpacing.label,
                          textTransform: 'uppercase',
                        }}>
                        +{l.leader_points - l.my_points} PKT VORN
                      </Text>
                    ) : null}
                  </View>
                ) : null}
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
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emptyCard: { alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaderFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
