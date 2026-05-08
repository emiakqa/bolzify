import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { SectionHeader } from '@/components/ui/section-header';
import { TeamFlag } from '@/components/ui/team-flag';
import {
  Colors,
  FontSize,
  Fonts,
  LetterSpacing,
  LineHeight,
  Radius,
  Spacing,
} from '@/constants/design';
import { useActiveLeague } from '@/hooks/use-active-league';
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
  home_team_id: number | null;
  away_team_id: number | null;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
};

type TeamLogos = { home: string | null; away: string | null };

type Tip = {
  match_id: number;
  home_goals: number;
  away_goals: number;
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

  // Aktive Liga steuert: Hero-Tipp, Sondertipp-Status. Ligen-Liste wird auch
  // unten als "Deine Ligen" gerendert — wir teilen sie statt zwei Mal zu
  // laden.
  const { leagues: myLeagues, activeLeagueId, setActive } = useActiveLeague();

  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [nextMatchTip, setNextMatchTip] = useState<Tip | null>(null);
  const [logos, setLogos] = useState<TeamLogos>({ home: null, away: null });
  const [specialStatus, setSpecialStatus] = useState<SpecialTipsStatus>({ filled: 0, total: 5 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    setError(null);
    try {
    const tournament = await getCurrentTournament();
    const { data: matches } = await supabase
      .from('matches')
      .select('id, kickoff_at, home_team, away_team, home_team_id, away_team_id, stage, status, home_goals, away_goals')
      .eq('tournament', tournament)
      .eq('status', 'scheduled')
      .gt('kickoff_at', new Date().toISOString())
      .order('kickoff_at', { ascending: true })
      .limit(1);

    let finalMatch = matches?.[0] ?? null;
    if (!finalMatch) {
      const { data: last } = await supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, home_team_id, away_team_id, stage, status, home_goals, away_goals')
        .eq('tournament', tournament)
        .eq('status', 'finished')
        .order('kickoff_at', { ascending: false })
        .limit(1);
      finalMatch = last?.[0] ?? null;
    }
    if (!finalMatch) {
      const { data: first } = await supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, home_team_id, away_team_id, stage, status, home_goals, away_goals')
        .eq('tournament', tournament)
        .order('kickoff_at', { ascending: true })
        .limit(1);
      finalMatch = first?.[0] ?? null;
    }
    setNextMatch(finalMatch);

    // Hero-Tipp aus aktiver Liga (per-Liga-Tipps seit 0016).
    if (finalMatch && userId && activeLeagueId) {
      const { data: tip } = await supabase
        .from('tips')
        .select('match_id, home_goals, away_goals')
        .eq('user_id', userId)
        .eq('league_id', activeLeagueId)
        .eq('match_id', finalMatch.id)
        .maybeSingle();
      setNextMatchTip(tip ?? null);
    } else {
      setNextMatchTip(null);
    }

    // Team-Logos für Hero-Match (FIFA-Verbandswappen aus api-football)
    if (finalMatch && finalMatch.home_team_id && finalMatch.away_team_id) {
      const { data: teamRows } = await supabase
        .from('teams')
        .select('id, logo_url')
        .in('id', [finalMatch.home_team_id, finalMatch.away_team_id]);
      const homeLogo =
        teamRows?.find((t) => t.id === finalMatch.home_team_id)?.logo_url ?? null;
      const awayLogo =
        teamRows?.find((t) => t.id === finalMatch.away_team_id)?.logo_url ?? null;
      setLogos({ home: homeLogo, away: awayLogo });
    } else {
      setLogos({ home: null, away: null });
    }

    // Sondertipp-Status aus aktiver Liga (per-Liga seit 0016).
    if (userId && activeLeagueId) {
      const { data: special } = await supabase
        .from('special_tips')
        .select(
          'champion_team_id, runner_up_team_id, semifinalist_a_team_id, semifinalist_b_team_id, top_scorer_player_id',
        )
        .eq('user_id', userId)
        .eq('tournament', tournament)
        .eq('league_id', activeLeagueId)
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
    } else {
      setSpecialStatus({ filled: 0, total: 5 });
    }

    // myLeagues kommt aus useActiveLeague — kein separater Query mehr nötig.
    } catch (err) {
      console.error('[home] load failed', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [userId, activeLeagueId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const initials = (profile?.username ?? '??').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 14,
                fontFamily: Fonts.body.medium,
              }}>
              Moin
            </Text>
            <Text
              style={{
                color: c.text,
                fontSize: FontSize.display,
                lineHeight: LineHeight.display,
                fontFamily: Fonts.display.bold,
                letterSpacing: LetterSpacing.display,
                marginTop: 2,
              }}>
              @{profile?.username ?? '—'}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={({ pressed }) => [
              styles.avatarBtn,
              {
                backgroundColor: c.warmSoft,
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
              <Text style={{ color: c.warm, fontFamily: Fonts.display.bold, fontSize: 17 }}>
                {initials}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Liga-Picker (nur wenn ≥1 Liga) — die Hero-Tipps & Sondertipps
            unten beziehen sich auf die hier ausgewählte Liga. */}
        {myLeagues.length > 0 ? (
          <View style={{ marginBottom: Spacing.sm }}>
            <LeaguePickerBar
              leagues={myLeagues}
              activeId={activeLeagueId}
              onSelect={setActive}
            />
          </View>
        ) : null}

        {/* Live-Ticker (Mono Pulse) */}
        {nextMatch && nextMatch.status !== 'finished' ? (
          <View style={[styles.tickerBar, { backgroundColor: c.surface }]}>
            <View style={[styles.pulseDot, { backgroundColor: c.warm }]} />
            <Text
              style={{
                color: c.text,
                fontFamily: Fonts.mono.semibold,
                fontSize: 11,
                letterSpacing: 0.6,
              }}>
              {formatCountdown(nextMatch.kickoff_at, now)}
            </Text>
            <Text style={{ color: c.textFaint }}>·</Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.mono.regular,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
              numberOfLines={1}>
              bis Anpfiff {(nextMatch.home_team ?? '').slice(0, 3)}–{(nextMatch.away_team ?? '').slice(0, 3)}
            </Text>
          </View>
        ) : null}

        {/* Match-Hero (Score-as-Hero) */}
        {error ? (
          <View style={{ marginTop: Spacing.md }}>
            <ErrorCard message={error} onRetry={load} />
          </View>
        ) : loading ? (
          <Card padding="lg" style={{ marginTop: Spacing.md }}>
            <ActivityIndicator color={c.textMuted} />
          </Card>
        ) : !nextMatch ? (
          <Card padding="lg" style={{ marginTop: Spacing.md }}>
            <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
              Noch keine Matches in der DB.
            </Text>
          </Card>
        ) : (
          <View style={{ marginTop: Spacing.md }}>
            <MatchHero
              match={nextMatch}
              tip={nextMatchTip}
              logos={logos}
              now={now}
              c={c}
              noLeagues={myLeagues.length === 0}
              onPress={() => {
                // Ohne Liga kein Tipp möglich — direkt zur Liga-Erstellung
                // schicken statt ins Tipp-Modal das eh nur Empty-State zeigt.
                if (myLeagues.length === 0) {
                  router.push('/leagues-new');
                  return;
                }
                router.push({
                  pathname: '/tip/[matchId]',
                  params: {
                    matchId: String(nextMatch.id),
                    ...(activeLeagueId ? { leagueId: activeLeagueId } : {}),
                  },
                });
              }}
            />
          </View>
        )}

        {/* Sondertipps (warm) — nur sinnvoll mit Liga, sonst weglassen. */}
        {myLeagues.length > 0 ? (
          <Card
            variant="warm"
            padding="md"
            onPress={() => router.push('/special-tips')}
            style={{ marginTop: Spacing.md }}>
            <View style={styles.specialInner}>
              <View style={[styles.specialIcon, { backgroundColor: c.warm }]}>
                <Text style={{ color: c.warmFg, fontFamily: Fonts.display.bold, fontSize: 20 }}>
                  ★
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: Fonts.display.bold,
                    fontSize: 15,
                    letterSpacing: -0.3,
                  }}>
                  Sondertipps
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: Fonts.mono.regular,
                    fontSize: 12,
                    letterSpacing: 0.4,
                    marginTop: 2,
                  }}>
                  {specialStatus.filled}/{specialStatus.total} ABGEGEBEN · VOR ANPFIFF
                </Text>
              </View>
              <Text style={{ color: c.warm, fontSize: 22 }}>›</Text>
            </View>
          </Card>
        ) : null}

        {/* Ligen */}
        <SectionHeader
          title="Deine Ligen"
          marginTop={Spacing.lg}
          action={
            myLeagues.length > 0
              ? { label: 'Alle', onPress: () => router.push('/(tabs)/leagues') }
              : undefined
          }
        />

        {myLeagues.length === 0 ? (
          <Card padding="lg">
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 14,
                lineHeight: 22,
                textAlign: 'center',
              }}>
              Noch keine Liga.{'\n'}Leg eine an oder tritt per Code bei.
            </Text>
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
                  <View style={[styles.ligaIcon, { backgroundColor: c.accentSoft }]}>
                    <Text
                      style={{ color: c.accent, fontFamily: Fonts.display.bold, fontSize: 15 }}>
                      {l.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: c.text,
                        fontSize: 16,
                        fontFamily: Fonts.display.bold,
                        letterSpacing: -0.3,
                      }}>
                      {l.name}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontSize: 11,
                        fontFamily: Fonts.mono.semibold,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        marginTop: 2,
                      }}>
                      {l.member_count} {l.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
                    </Text>
                  </View>
                  <Text style={{ color: c.textFaint, fontSize: 18 }}>›</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={[styles.footer, { color: c.textFaint }]}>{user?.email}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MatchHero({
  match,
  tip,
  logos,
  now,
  c,
  noLeagues,
  onPress,
}: {
  match: Match;
  tip: Tip | null;
  logos: TeamLogos;
  now: number;
  c: (typeof Colors)['light'];
  noLeagues: boolean;
  onPress: () => void;
}) {
  const countdown = formatCountdown(match.kickoff_at, now);
  const isFinished =
    match.status === 'finished' && match.home_goals !== null && match.away_goals !== null;

  // Hero-Score: realer Score wenn finished, Tipp wenn schon getippt, sonst —
  const heroH = isFinished ? match.home_goals : tip?.home_goals;
  const heroA = isFinished ? match.away_goals : tip?.away_goals;

  // CTA-Label kontextuell:
  // - Schon getippt → "GESPEICHERT ✓"
  // - Keine Liga    → "ERST LIGA, DANN TIPPEN ›"
  // - sonst         → "JETZT TIPPEN ›"
  const ctaLabel = tip
    ? 'DEIN TIPP · GESPEICHERT ✓'
    : noLeagues
      ? 'ERST LIGA, DANN TIPPEN ›'
      : 'JETZT TIPPEN ›';
  const ctaColor = tip ? c.accent : c.warm;

  return (
    <Card variant="elevated" onPress={onPress} padding="md">
      <View style={styles.heroTop}>
        <Badge label={match.stage ?? 'TBD'} tone="neutral" />
        {isFinished ? (
          <Badge label="BEENDET" tone="neutral" />
        ) : (
          <Badge label={`► ${countdown}`} tone="warm" />
        )}
      </View>

      <View style={styles.heroTeams}>
        <TeamPole c={c} name={deName(match.home_team)} logo={logos.home} />
        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreNum, { color: c.text, fontFamily: Fonts.display.bold }]}>
            {heroH ?? '—'}
          </Text>
          <Text
            style={[styles.scoreColon, { color: c.textFaint, fontFamily: Fonts.display.bold }]}>
            :
          </Text>
          <Text style={[styles.scoreNum, { color: c.text, fontFamily: Fonts.display.bold }]}>
            {heroA ?? '—'}
          </Text>
        </View>
        <TeamPole c={c} name={deName(match.away_team)} logo={logos.away} />
      </View>

      <View style={[styles.heroFooter, { borderTopColor: c.divider }]}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: Fonts.mono.semibold,
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          {formatKickoffDate(match.kickoff_at)} · {formatKickoffTime(match.kickoff_at)}
        </Text>
        <Text
          style={{
            color: ctaColor,
            fontFamily: Fonts.mono.bold,
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          {ctaLabel}
        </Text>
      </View>
    </Card>
  );
}

function TeamPole({
  c,
  name,
  logo,
}: {
  c: (typeof Colors)['light'];
  name: string;
  logo: string | null;
}) {
  return (
    <View style={styles.teamPole}>
      <TeamFlag logoUrl={logo} size={56} />
      <Text
        numberOfLines={1}
        style={{
          color: c.text,
          fontFamily: Fonts.display.bold,
          fontSize: 15,
          letterSpacing: -0.3,
          marginTop: 8,
          textAlign: 'center',
        }}>
        {name}
      </Text>
    </View>
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
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  tickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
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
  specialIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ligaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ligaIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 4,
  },
  teamPole: { flex: 1, alignItems: 'center' },
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  scoreNum: {
    fontSize: 48,
    letterSpacing: -2,
    lineHeight: 50,
  },
  scoreColon: {
    fontSize: 30,
    lineHeight: 50,
  },
  heroFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    marginTop: Spacing.xxl,
    fontSize: FontSize.xs,
    fontFamily: Fonts.body.regular,
    textAlign: 'center',
  },
});
