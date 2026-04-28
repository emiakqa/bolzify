import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
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
import { deName } from '@/lib/country-names';
import { getCurrentTournament } from '@/lib/current-tournament';
import { formatCountdown, formatKickoffDate, formatKickoffTime } from '@/lib/format';
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

type LeaguePreview = {
  id: string;
  name: string;
  member_count: number;
};

type SpecialTipsStatus = {
  filled: number;
  total: number;
};

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [nextMatchTip, setNextMatchTip] = useState<Tip | null>(null);
  const [myLeagues, setMyLeagues] = useState<LeaguePreview[]>([]);
  const [specialStatus, setSpecialStatus] = useState<SpecialTipsStatus>({ filled: 0, total: 5 });
  const [specialPoints, setSpecialPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    const t0 = Date.now();
    console.log('[Home] load() start, userId=', userId);
    // Tournament-Filter zwingend — sonst zieht der "letztes finished"-Fallback
    // Daten anderer Turniere ins Frontend, falls das aktive Turnier noch keine
    // gespielten Matches hat.
    const tournament = await getCurrentTournament();
    const { data: matches, error: mErr } = await supabase
      .from('matches')
      .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
      .eq('tournament', tournament)
      .eq('status', 'scheduled')
      .gt('kickoff_at', new Date().toISOString())
      .order('kickoff_at', { ascending: true })
      .limit(1);
    console.log(
      '[Home] matches query done after',
      Date.now() - t0,
      'ms, rows=',
      matches?.length ?? 0,
      'err=',
      mErr?.message,
    );

    const m = matches?.[0] ?? null;
    let finalMatch = m;
    if (!finalMatch) {
      const { data: last } = await supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
        .eq('tournament', tournament)
        .eq('status', 'finished')
        .order('kickoff_at', { ascending: false })
        .limit(1);
      finalMatch = last?.[0] ?? null;
    }
    if (!finalMatch) {
      const { data: first } = await supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
        .eq('tournament', tournament)
        .order('kickoff_at', { ascending: true })
        .limit(1);
      finalMatch = first?.[0] ?? null;
    }
    setNextMatch(finalMatch);

    if (finalMatch && userId) {
      const { data: tip } = await supabase
        .from('tips')
        .select('match_id, home_goals, away_goals')
        .eq('user_id', userId)
        .eq('match_id', finalMatch.id)
        .maybeSingle();
      setNextMatchTip(tip ?? null);
    } else {
      setNextMatchTip(null);
    }

    if (userId) {
      const { data: special } = await supabase
        .from('special_tips')
        .select(
          'champion_team_id, runner_up_team_id, semifinalist_a_team_id, semifinalist_b_team_id, top_scorer_player_id',
        )
        .eq('user_id', userId)
        .eq('tournament', tournament)
        .maybeSingle();
      if (special) {
        const filled = [
          special.champion_team_id,
          special.runner_up_team_id,
          special.semifinalist_a_team_id,
          special.semifinalist_b_team_id,
          special.top_scorer_player_id,
        ].filter((v) => v != null).length;
        setSpecialStatus({ filled, total: 5 });
      } else {
        setSpecialStatus({ filled: 0, total: 5 });
      }

      const { data: scoredSpecial } = await supabase
        .from('scored_special_tips')
        .select('total_points')
        .eq('user_id', userId)
        .eq('tournament', tournament)
        .maybeSingle();
      setSpecialPoints(scoredSpecial?.total_points ?? null);
    }

    if (userId) {
      const { data: memberRows } = await supabase
        .from('league_members')
        .select('league_id')
        .eq('user_id', userId);
      const ids = (memberRows ?? []).map((r) => r.league_id);
      if (ids.length > 0) {
        const { data: lgs } = await supabase
          .from('leagues')
          .select('id, name')
          .in('id', ids)
          .order('created_at', { ascending: false })
          .limit(3);
        const { data: counts } = await supabase
          .from('league_members')
          .select('league_id')
          .in('league_id', ids);
        const countMap = new Map<string, number>();
        for (const row of counts ?? [])
          countMap.set(row.league_id, (countMap.get(row.league_id) ?? 0) + 1);
        setMyLeagues(
          (lgs ?? []).map((l) => ({ ...l, member_count: countMap.get(l.id) ?? 1 })),
        );
      } else {
        setMyLeagues([]);
      }
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.textMuted}
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.sm,
                lineHeight: LineHeight.sm,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.medium,
              }}>
              Moin
            </ThemedText>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.display,
                lineHeight: LineHeight.display,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.heavy,
                letterSpacing: LetterSpacing.display,
                marginTop: 2,
              }}>
              @{profile?.username ?? '—'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={({ pressed }) => [
              styles.avatarBtn,
              {
                borderColor: c.borderStrong,
                backgroundColor: c.surface,
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <IconSymbol name="gearshape.fill" size={22} color={c.textMuted} />
            )}
          </Pressable>
        </View>

        {/* Hero: Next Match */}
        <SectionHeader
          title={nextMatch?.status === 'finished' ? 'Letztes Ergebnis' : 'Nächstes Match'}
          marginTop={Spacing.lg}
        />

        {loading ? (
          <Card>
            <ActivityIndicator color={c.textMuted} />
          </Card>
        ) : !nextMatch ? (
          <Card>
            <ThemedText style={{ color: c.textMuted }}>
              Noch keine Matches in der DB.
            </ThemedText>
          </Card>
        ) : (
          <MatchHero
            match={nextMatch}
            tip={nextMatchTip}
            now={now}
            c={c}
            onPress={() =>
              router.push({
                pathname: '/tip/[matchId]',
                params: { matchId: String(nextMatch.id) },
              })
            }
          />
        )}

        {/* Sondertipps */}
        <SectionHeader title="Sondertipps" />
        <Card
          variant={specialStatus.filled > 0 ? 'accent' : 'default'}
          onPress={() => router.push('/special-tips')}>
          <View style={styles.specialInner}>
            <View style={{ flex: 1 }}>
              <ThemedText
                style={{
                  color: c.text,
                  fontSize: FontSize.md,
                  fontFamily: Fonts?.rounded,
                  fontWeight: FontWeight.semibold,
                }}>
                Weltmeister · Finalist · Torschützenkönig
              </ThemedText>
              <ThemedText
                style={{
                  color: c.textMuted,
                  fontSize: FontSize.sm,
                  marginTop: 4,
                }}>
                {specialStatus.filled === 0
                  ? 'Noch nicht getippt — vor Turnierstart abgeben'
                  : specialStatus.filled === specialStatus.total
                    ? '✓ Alle Sondertipps abgegeben'
                    : `${specialStatus.filled} von ${specialStatus.total} Feldern ausgefüllt`}
              </ThemedText>
            </View>
            {specialPoints !== null && specialPoints > 0 ? (
              <Badge label={`${specialPoints} Pkt`} tone="accent" />
            ) : null}
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.xl,
                fontWeight: FontWeight.regular,
              }}>
              ›
            </ThemedText>
          </View>
        </Card>

        {/* Ligen */}
        <SectionHeader
          title="Deine Ligen"
          action={{ label: 'Alle', onPress: () => router.push('/(tabs)/leagues') }}
        />

        {myLeagues.length === 0 ? (
          <Card padding="lg">
            <ThemedText
              style={{
                color: c.textMuted,
                textAlign: 'center',
                fontSize: FontSize.md,
                lineHeight: 22,
              }}>
              Noch keine Liga.{'\n'}Leg eine an oder tritt per Code bei.
            </ThemedText>
            <View style={styles.ctaRow}>
              <Button
                label="Liga erstellen"
                size="md"
                fullWidth
                onPress={() => router.push('/leagues-new')}
                style={{ flex: 1 }}
              />
              <Button
                label="Beitreten"
                variant="secondary"
                size="md"
                fullWidth
                onPress={() => router.push('/leagues-join')}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {myLeagues.map((l) => (
              <Card
                key={l.id}
                onPress={() => router.push({ pathname: '/leagues/[id]', params: { id: l.id } })}
                padding="md">
                <View style={styles.ligaInner}>
                  <View
                    style={[
                      styles.ligaIcon,
                      { backgroundColor: c.accentSoft },
                    ]}>
                    <IconSymbol name="person.3.fill" size={18} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={{
                        color: c.text,
                        fontSize: FontSize.md,
                        fontFamily: Fonts?.rounded,
                        fontWeight: FontWeight.semibold,
                      }}>
                      {l.name}
                    </ThemedText>
                    <ThemedText
                      style={{
                        color: c.textMuted,
                        fontSize: FontSize.sm,
                        marginTop: 2,
                      }}>
                      {l.member_count} {l.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={{
                      color: c.textFaint,
                      fontSize: FontSize.xl,
                    }}>
                    ›
                  </ThemedText>
                </View>
              </Card>
            ))}
          </View>
        )}

        <ThemedText style={[styles.footer, { color: c.textFaint }]}>{user?.email}</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

function MatchHero({
  match,
  tip,
  now,
  c,
  onPress,
}: {
  match: Match;
  tip: Tip | null;
  now: number;
  c: (typeof Colors)['dark'];
  onPress: () => void;
}) {
  const countdown = formatCountdown(match.kickoff_at, now);
  const isFinished =
    match.status === 'finished' && match.home_goals !== null && match.away_goals !== null;

  let tipOutcome: 'exact' | 'diff' | 'trend' | 'miss' | null = null;
  if (isFinished && tip) {
    const hg = match.home_goals!;
    const ag = match.away_goals!;
    if (tip.home_goals === hg && tip.away_goals === ag) tipOutcome = 'exact';
    else if (tip.home_goals - tip.away_goals === hg - ag) tipOutcome = 'diff';
    else if (Math.sign(tip.home_goals - tip.away_goals) === Math.sign(hg - ag))
      tipOutcome = 'trend';
    else tipOutcome = 'miss';
  }

  return (
    <Card variant="elevated" onPress={onPress} padding="lg">
      <View style={styles.heroTop}>
        <Badge label={match.stage ?? 'TBD'} tone="neutral" />
        {isFinished ? (
          <Badge label="Beendet" tone="neutral" />
        ) : (
          <Badge label={countdown} tone="accent" />
        )}
      </View>

      <View style={styles.heroTeams}>
        <View style={styles.teamWrap}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.lg,
              lineHeight: LineHeight.lg,
              fontFamily: Fonts?.rounded,
              fontWeight: FontWeight.bold,
              textAlign: 'center',
            }}>
            {deName(match.home_team)}
          </ThemedText>
        </View>
        {isFinished ? (
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.jumbo,
              lineHeight: LineHeight.jumbo,
              fontFamily: Fonts?.rounded,
              fontWeight: FontWeight.heavy,
              letterSpacing: LetterSpacing.display,
              minWidth: 100,
              textAlign: 'center',
            }}>
            {match.home_goals}:{match.away_goals}
          </ThemedText>
        ) : (
          <View style={[styles.vsCircle, { backgroundColor: c.accentSoft }]}>
            <ThemedText
              style={{
                color: c.accent,
                fontSize: FontSize.sm,
                lineHeight: LineHeight.sm,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              }}>
              VS
            </ThemedText>
          </View>
        )}
        <View style={styles.teamWrap}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.lg,
              lineHeight: LineHeight.lg,
              fontFamily: Fonts?.rounded,
              fontWeight: FontWeight.bold,
              textAlign: 'center',
            }}>
            {deName(match.away_team)}
          </ThemedText>
        </View>
      </View>

      <ThemedText
        style={{
          color: c.textMuted,
          fontSize: FontSize.sm,
          textAlign: 'center',
        }}>
        {formatKickoffDate(match.kickoff_at)} · {formatKickoffTime(match.kickoff_at)}
      </ThemedText>

      {/* CTA-Pill am unteren Card-Rand */}
      <View style={styles.heroCta}>
        {isFinished ? (
          tip ? (
            <View
              style={[
                styles.ctaPill,
                {
                  backgroundColor:
                    tipOutcome === 'miss' ? c.surfaceElevated : c.accentSoft,
                  borderColor: tipOutcome === 'miss' ? c.border : c.accentBorder,
                },
              ]}>
              <ThemedText
                style={{
                  color: tipOutcome === 'miss' ? c.textMuted : c.accent,
                  fontFamily: Fonts?.rounded,
                  fontWeight: FontWeight.semibold,
                  fontSize: FontSize.md,
                }}>
                Dein Tipp: {tip.home_goals}:{tip.away_goals}
                {tipOutcome === 'exact'
                  ? '  ✓ exakt'
                  : tipOutcome === 'diff'
                    ? '  ✓ Differenz'
                    : tipOutcome === 'trend'
                      ? '  ✓ Tendenz'
                      : ''}
              </ThemedText>
            </View>
          ) : (
            <View
              style={[
                styles.ctaPill,
                { backgroundColor: c.surfaceElevated, borderColor: c.border },
              ]}>
              <ThemedText
                style={{
                  color: c.textMuted,
                  fontFamily: Fonts?.rounded,
                  fontWeight: FontWeight.semibold,
                  fontSize: FontSize.md,
                }}>
                Kein Tipp abgegeben
              </ThemedText>
            </View>
          )
        ) : (
          <View
            style={[
              styles.ctaPill,
              tip
                ? { backgroundColor: c.surfaceElevated, borderColor: c.border }
                : { backgroundColor: c.accent, borderColor: c.accent },
            ]}>
            <ThemedText
              style={{
                color: tip ? c.text : c.accentFg,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.bold,
                fontSize: FontSize.md,
              }}>
              {tip ? `Dein Tipp: ${tip.home_goals}:${tip.away_goals}` : 'Jetzt tippen →'}
            </ThemedText>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  specialInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ligaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ligaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  teamWrap: {
    flex: 1,
  },
  vsCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCta: {
    marginTop: Spacing.md,
  },
  ctaPill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  footer: {
    marginTop: Spacing.xxl,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
