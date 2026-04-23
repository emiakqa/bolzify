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
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { deName } from '@/lib/country-names';
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

// Wie weit hat der User seine Sondertipps schon ausgefüllt? Rein UI-Status.
type SpecialTipsStatus = {
  filled: number;
  total: number; // 5 Slots: champion, runner_up, semifinal_a, semifinal_b, top_scorer
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // WICHTIG: Dep auf user.id (Primitive, stabil), NICHT auf user (Objekt).
  // Supabase gibt bei jedem onAuthStateChange / Token-Refresh ein neues
  // session.user-Objekt zurück → sonst würde `load` ständig neu referenziert
  // und unser useEffect(load) würde alle 10–20s die Daten reloaden.
  const userId = user?.id ?? null;
  const load = useCallback(async () => {
    const t0 = Date.now();
    console.log('[Home] load() start, userId=', userId);
    const { data: matches, error: mErr } = await supabase
      .from('matches')
      .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
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

    // Fallback: wenn kein zukünftiges Spiel mehr existiert, zeig stattdessen
    // das zuletzt beendete Match mit Endstand (z.B. während der WM zwischen
    // zwei Spieltagen, oder komplett nach dem Turnier).
    let finalMatch = m;
    if (!finalMatch) {
      const { data: last } = await supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
        .eq('status', 'finished')
        .order('kickoff_at', { ascending: false })
        .limit(1);
      finalMatch = last?.[0] ?? null;
    }
    // Letzter Fallback (Dev-DB ohne finished Matches): erstes Match überhaupt.
    if (!finalMatch) {
      const { data: first } = await supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
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

    // Sondertipps-Status (für Home-Card).
    if (userId) {
      const { data: special } = await supabase
        .from('special_tips')
        .select(
          'champion_team_id, runner_up_team_id, semifinalist_a_team_id, semifinalist_b_team_id, top_scorer_player_id',
        )
        .eq('user_id', userId)
        .eq('tournament', 'WM2026')
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
    }

    // Meine Ligen (Preview — max 3 auf Home)
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
        for (const row of counts ?? []) countMap.set(row.league_id, (countMap.get(row.league_id) ?? 0) + 1);
        setMyLeagues((lgs ?? []).map((l) => ({ ...l, member_count: countMap.get(l.id) ?? 1 })));
      } else {
        setMyLeagues([]);
      }
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Countdown einmal pro Minute aktualisieren.
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />}>
        <View style={styles.header}>
          <View>
            <ThemedText style={[styles.hi, { color: c.textMuted }]}>Moin</ThemedText>
            <ThemedText style={[styles.username, { color: c.text }]}>
              @{profile?.username ?? '—'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={({ pressed }) => [
              styles.settingsBtn,
              { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 },
            ]}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.settingsAvatar}
                contentFit="cover"
              />
            ) : (
              <IconSymbol name="gearshape.fill" size={22} color={c.textMuted} />
            )}
          </Pressable>
        </View>

        <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>
          {nextMatch?.status === 'finished' ? 'Letztes Ergebnis' : 'Nächstes Match'}
        </ThemedText>

        {loading ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ActivityIndicator color={c.textMuted} />
          </View>
        ) : !nextMatch ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText style={{ color: c.textMuted }}>
              Noch keine Matches in der DB.
            </ThemedText>
          </View>
        ) : (
          <MatchCard
            match={nextMatch}
            tip={nextMatchTip}
            now={now}
            c={c}
            onPress={() => router.push({ pathname: '/tip/[matchId]', params: { matchId: String(nextMatch.id) } })}
          />
        )}

        <ThemedText style={[styles.sectionLabel, { color: c.textFaint, marginTop: Spacing.xl }]}>
          Sondertipps
        </ThemedText>
        <Pressable
          onPress={() => router.push('/special-tips')}
          style={({ pressed }) => [
            styles.specialRow,
            {
              backgroundColor: c.surface,
              borderColor: specialStatus.filled > 0 ? c.accent : c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <View style={{ flex: 1 }}>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.md,
                fontWeight: FontWeight.semibold,
              }}>
              Weltmeister, Finalist, Torschützenkönig …
            </ThemedText>
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
              {specialStatus.filled === 0
                ? 'Noch nicht getippt'
                : specialStatus.filled === specialStatus.total
                ? 'Alle Sondertipps abgegeben'
                : `${specialStatus.filled} von ${specialStatus.total} Feldern ausgefüllt`}
            </ThemedText>
          </View>
          <ThemedText style={{ color: c.textFaint, fontSize: FontSize.lg }}>›</ThemedText>
        </Pressable>

        <View style={styles.ligaHeader}>
          <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>Deine Ligen</ThemedText>
          <Pressable onPress={() => router.push('/(tabs)/leagues')} hitSlop={8}>
            <ThemedText style={{ color: c.accent, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
              Alle ›
            </ThemedText>
          </Pressable>
        </View>

        {myLeagues.length === 0 ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
              Noch keine Liga.{'\n'}Leg eine an oder tritt per Code bei.
            </ThemedText>
            <View style={styles.ctaRow}>
              <Pressable
                onPress={() => router.push('/leagues-new')}
                style={({ pressed }) => [
                  styles.ctaPrimary,
                  { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText
                  style={{
                    color: c.accentFg,
                    fontWeight: FontWeight.semibold,
                    fontSize: FontSize.sm,
                  }}>
                  Liga erstellen
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push('/leagues-join')}
                style={({ pressed }) => [
                  styles.ctaSecondary,
                  { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText
                  style={{
                    color: c.text,
                    fontWeight: FontWeight.semibold,
                    fontSize: FontSize.sm,
                  }}>
                  Beitreten
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          myLeagues.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push({ pathname: '/leagues/[id]', params: { id: l.id } })}
              style={({ pressed }) => [
                styles.ligaRow,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: c.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold }}>
                  {l.name}
                </ThemedText>
                <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                  {l.member_count} {l.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
                </ThemedText>
              </View>
              <ThemedText style={{ color: c.textFaint, fontSize: FontSize.md }}>›</ThemedText>
            </Pressable>
          ))
        )}

        <ThemedText style={[styles.footer, { color: c.textFaint }]}>
          {user?.email}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

function MatchCard({
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

  // Treffer-Bewertung für die CTA-Zeile im beendeten Fall.
  let tipOutcome: 'exact' | 'diff' | 'trend' | 'miss' | null = null;
  if (isFinished && tip) {
    const hg = match.home_goals!;
    const ag = match.away_goals!;
    if (tip.home_goals === hg && tip.away_goals === ag) tipOutcome = 'exact';
    else if (tip.home_goals - tip.away_goals === hg - ag) tipOutcome = 'diff';
    else if (Math.sign(tip.home_goals - tip.away_goals) === Math.sign(hg - ag)) tipOutcome = 'trend';
    else tipOutcome = 'miss';
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.cardTop}>
        <ThemedText style={{ color: c.nostalgia, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
          {match.stage ?? 'TBD'}
        </ThemedText>
        <ThemedText
          style={{
            color: isFinished ? c.textMuted : c.accent,
            fontSize: FontSize.sm,
            fontWeight: FontWeight.semibold,
          }}>
          {isFinished ? 'Beendet' : countdown}
        </ThemedText>
      </View>

      <View style={styles.teams}>
        <ThemedText style={[styles.team, { color: c.text }]}>{deName(match.home_team)}</ThemedText>
        {isFinished ? (
          <ThemedText style={[styles.score, { color: c.text }]}>
            {match.home_goals} : {match.away_goals}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.vs, { color: c.textFaint }]}>vs</ThemedText>
        )}
        <ThemedText style={[styles.team, { color: c.text }]}>{deName(match.away_team)}</ThemedText>
      </View>

      <ThemedText style={{ color: c.textMuted, fontSize: FontSize.sm, textAlign: 'center' }}>
        {formatKickoffDate(match.kickoff_at)} · {formatKickoffTime(match.kickoff_at)}
      </ThemedText>

      {isFinished ? (
        tip ? (
          <View
            style={[
              styles.cta,
              {
                backgroundColor: c.surfaceElevated,
                borderColor: tipOutcome === 'miss' ? c.border : c.accent,
              },
            ]}>
            <ThemedText
              style={{
                color: tipOutcome === 'miss' ? c.textMuted : c.accent,
                fontWeight: FontWeight.semibold,
                fontSize: FontSize.md,
              }}>
              Dein Tipp: {tip.home_goals} : {tip.away_goals}
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
              styles.cta,
              { backgroundColor: c.surfaceElevated, borderColor: c.border },
            ]}>
            <ThemedText
              style={{ color: c.textMuted, fontWeight: FontWeight.semibold, fontSize: FontSize.md }}>
              Kein Tipp abgegeben
            </ThemedText>
          </View>
        )
      ) : (
        <View
          style={[
            styles.cta,
            {
              backgroundColor: tip ? c.surfaceElevated : c.accent,
              borderColor: tip ? c.border : c.accent,
            },
          ]}>
          <ThemedText
            style={{
              color: tip ? c.text : c.accentFg,
              fontWeight: FontWeight.semibold,
              fontSize: FontSize.md,
            }}>
            {tip ? `Dein Tipp: ${tip.home_goals} : ${tip.away_goals}` : 'Jetzt tippen'}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  hi: { fontSize: FontSize.sm },
  username: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginTop: 2 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  settingsAvatar: { width: '100%', height: '100%' },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  ctaPrimary: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  ctaSecondary: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    fontWeight: FontWeight.semibold,
  },
  ligaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  specialRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ligaRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  team: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    flex: 1,
    textAlign: 'center',
  },
  vs: { fontSize: FontSize.sm, textTransform: 'uppercase' },
  score: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, minWidth: 64, textAlign: 'center' },
  cta: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  footer: {
    marginTop: Spacing.xxl,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
