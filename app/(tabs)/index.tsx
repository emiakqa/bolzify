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
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { formatCountdown, formatKickoffDate, formatKickoffTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Match = {
  id: number;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  stage: string | null;
  status: string;
};

type Tip = {
  match_id: number;
  home_goals: number;
  away_goals: number;
};

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [nextMatchTip, setNextMatchTip] = useState<Tip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('id, kickoff_at, home_team, away_team, stage, status')
      .eq('status', 'scheduled')
      .gt('kickoff_at', new Date().toISOString())
      .order('kickoff_at', { ascending: true })
      .limit(1);

    const m = matches?.[0] ?? null;

    // Fallback: wenn kein zukünftiges Spiel mehr existiert (z.B. WM-2022-Dev-Daten),
    // nimm einfach das chronologisch erste Spiel zum Anzeigen.
    let finalMatch = m;
    if (!finalMatch) {
      const { data: first } = await supabase
        .from('matches')
        .select('id, kickoff_at, home_team, away_team, stage, status')
        .order('kickoff_at', { ascending: true })
        .limit(1);
      finalMatch = first?.[0] ?? null;
    }
    setNextMatch(finalMatch);

    if (finalMatch && user) {
      const { data: tip } = await supabase
        .from('tips')
        .select('match_id, home_goals, away_goals')
        .eq('user_id', user.id)
        .eq('match_id', finalMatch.id)
        .maybeSingle();
      setNextMatchTip(tip ?? null);
    } else {
      setNextMatchTip(null);
    }

    setLoading(false);
  }, [user]);

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
          <Pressable onPress={signOut} hitSlop={12}>
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.sm }}>Logout</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>Nächstes Match</ThemedText>

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
          Deine Liga
        </ThemedText>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, alignItems: 'center' }]}>
          <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
            Noch keine Liga.{'\n'}Liga-Feature kommt in Woche 2.
          </ThemedText>
        </View>

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
        <ThemedText style={{ color: c.accent, fontSize: FontSize.sm, fontWeight: FontWeight.semibold }}>
          {countdown}
        </ThemedText>
      </View>

      <View style={styles.teams}>
        <ThemedText style={[styles.team, { color: c.text }]}>{match.home_team}</ThemedText>
        <ThemedText style={[styles.vs, { color: c.textFaint }]}>vs</ThemedText>
        <ThemedText style={[styles.team, { color: c.text }]}>{match.away_team}</ThemedText>
      </View>

      <ThemedText style={{ color: c.textMuted, fontSize: FontSize.sm, textAlign: 'center' }}>
        {formatKickoffDate(match.kickoff_at)} · {formatKickoffTime(match.kickoff_at)}
      </ThemedText>

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
  sectionLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    fontWeight: FontWeight.semibold,
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
