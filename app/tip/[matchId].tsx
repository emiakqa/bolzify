import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickerGroup, PickerPlayer, PlayerPicker } from '@/components/player-picker';
import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
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

// Zeitsperre gilt nur für das produktive Turnier WM2026.
// WM2022 & andere Dev-Turniere sind jederzeit tippbar.
const LIVE_TOURNAMENT = 'WM2026';

const MAX_GOALS = 9;

export default function TipScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [match, setMatch] = useState<Match | null>(null);
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [scorer, setScorer] = useState<PickerPlayer | null>(null);
  const [squads, setSquads] = useState<PickerGroup[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      if (!matchId || !user) return;
      const numericId = Number(matchId);

      const { data: m } = await supabase
        .from('matches')
        .select(
          'id, tournament, kickoff_at, home_team, away_team, home_team_id, away_team_id, stage, status, home_goals, away_goals',
        )
        .eq('id', numericId)
        .maybeSingle();
      setMatch(m);

      // Kader beider Teams ziehen. Client-seitig in Gruppen pro Team splitten.
      if (m?.home_team_id && m?.away_team_id) {
        const { data: playerRows } = await supabase
          .from('players')
          .select('id, team_id, name, number, position')
          .in('team_id', [m.home_team_id, m.away_team_id])
          .order('number', { ascending: true, nullsFirst: false });

        const groups: PickerGroup[] = [
          {
            teamId: m.home_team_id,
            teamName: m.home_team,
            players: (playerRows ?? []).filter((p) => p.team_id === m.home_team_id),
          },
          {
            teamId: m.away_team_id,
            teamName: m.away_team,
            players: (playerRows ?? []).filter((p) => p.team_id === m.away_team_id),
          },
        ];
        setSquads(groups);
      }

      const { data: tip } = await supabase
        .from('tips')
        .select('home_goals, away_goals, first_scorer, first_scorer_id')
        .eq('user_id', user.id)
        .eq('match_id', numericId)
        .maybeSingle();

      if (tip) {
        setHome(tip.home_goals);
        setAway(tip.away_goals);
        if (tip.first_scorer_id) {
          // Name gleich aus den squads auflösen, sobald die geladen sind (async race ok,
          // weil setSquads vorher läuft).
          const { data: p } = await supabase
            .from('players')
            .select('id, name, number, position')
            .eq('id', tip.first_scorer_id)
            .maybeSingle();
          if (p) setScorer(p);
        }
      }
      setLoading(false);
    })();
  }, [matchId, user]);

  const tippable = match
    ? match.tournament !== LIVE_TOURNAMENT || isBeforeKickoff(match.kickoff_at)
    : false;

  const squadsLoaded = useMemo(
    () => squads.some((g) => g.players.length > 0),
    [squads],
  );

  const submit = async () => {
    if (!user || !match) return;
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('tips').upsert(
      {
        user_id: user.id,
        match_id: match.id,
        home_goals: home,
        away_goals: away,
        first_scorer: scorer?.name ?? null,
        first_scorer_id: scorer?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,match_id' },
    );
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => router.back(), 600);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <ThemedText style={{ color: c.textMuted }}>Match nicht gefunden.</ThemedText>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={{ color: c.accent }}>Zurück</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeRow}>
            <ThemedText style={{ color: c.textMuted }}>← Zurück</ThemedText>
          </Pressable>

          <ThemedText style={[styles.stage, { color: c.nostalgia }]}>{match.stage ?? ''}</ThemedText>
          <ThemedText style={[styles.kickoff, { color: c.textMuted }]}>
            {formatKickoffDate(match.kickoff_at)} · {formatKickoffTime(match.kickoff_at)}
          </ThemedText>

          <View style={styles.scoreBlock}>
            <Stepper
              label={match.home_team}
              value={home}
              onChange={setHome}
              disabled={!tippable || saving}
              c={c}
            />
            <ThemedText style={[styles.colon, { color: c.textFaint }]}>:</ThemedText>
            <Stepper
              label={match.away_team}
              value={away}
              onChange={setAway}
              disabled={!tippable || saving}
              c={c}
            />
          </View>

          {tippable ? (
            <>
              <ThemedText style={[styles.label, { color: c.textFaint }]}>
                Torschütze (optional, +3 Bonus)
              </ThemedText>

              <Pressable
                onPress={() => squadsLoaded && setPickerOpen(true)}
                disabled={!squadsLoaded || saving}
                style={({ pressed }) => [
                  styles.pickerField,
                  {
                    backgroundColor: c.surface,
                    borderColor: scorer ? c.accent : c.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                {scorer ? (
                  <View style={styles.pickerSelected}>
                    <ThemedText style={{ color: c.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold }}>
                      {scorer.name}
                    </ThemedText>
                    <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs }}>
                      {scorer.number ? `#${scorer.number}` : ''}
                      {scorer.number && scorer.position ? ' · ' : ''}
                      {scorer.position ?? ''}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText style={{ color: c.textFaint, fontSize: FontSize.md }}>
                    {squadsLoaded ? 'Spieler auswählen…' : 'Keine Kader in der DB'}
                  </ThemedText>
                )}
                <ThemedText style={{ color: c.textMuted, fontSize: FontSize.md }}>
                  {scorer ? '›' : '›'}
                </ThemedText>
              </Pressable>

              {!squadsLoaded ? (
                <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs, marginTop: Spacing.xs }}>
                  Kader nicht importiert. Lauf `node scripts/import-squads.mjs` lokal.
                </ThemedText>
              ) : null}

              {error && <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText>}

              <Pressable
                onPress={submit}
                disabled={saving}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: saved ? c.success : c.accent,
                    opacity: pressed || saving ? 0.7 : 1,
                  },
                ]}>
                <ThemedText style={{ color: c.accentFg, fontSize: FontSize.md, fontWeight: FontWeight.semibold }}>
                  {saved ? '✓ Gespeichert' : saving ? 'Speichere…' : 'Tipp speichern'}
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
                Anpfiff vorbei — Tipp-Abgabe gesperrt.
              </ThemedText>
              {match.status === 'finished' &&
              match.home_goals !== null &&
              match.away_goals !== null ? (
                <ThemedText
                  style={{
                    color: c.text,
                    textAlign: 'center',
                    fontSize: FontSize.lg,
                    fontWeight: FontWeight.semibold,
                    marginTop: Spacing.sm,
                  }}>
                  Endstand: {match.home_goals} : {match.away_goals}
                </ThemedText>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PlayerPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setScorer}
        groups={squads}
        selectedId={scorer?.id ?? null}
      />
    </SafeAreaView>
  );
}

function Stepper({
  label,
  value,
  onChange,
  disabled,
  c,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
  c: (typeof Colors)['dark'];
}) {
  return (
    <View style={styles.stepper}>
      <ThemedText
        style={[styles.stepperLabel, { color: c.text }]}
        numberOfLines={2}
        adjustsFontSizeToFit>
        {label}
      </ThemedText>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value <= 0}
          style={({ pressed }) => [
            styles.stepBtn,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
          ]}>
          <ThemedText style={{ color: c.text, fontSize: FontSize.xl, fontWeight: FontWeight.semibold }}>−</ThemedText>
        </Pressable>
        <ThemedText style={[styles.stepValue, { color: c.text }]}>{value}</ThemedText>
        <Pressable
          onPress={() => onChange(Math.min(MAX_GOALS, value + 1))}
          disabled={disabled || value >= MAX_GOALS}
          style={({ pressed }) => [
            styles.stepBtn,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
          ]}>
          <ThemedText style={{ color: c.text, fontSize: FontSize.xl, fontWeight: FontWeight.semibold }}>＋</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  closeRow: { marginBottom: Spacing.sm },
  stage: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  kickoff: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  colon: { fontSize: FontSize.display, lineHeight: FontSize.display + 8, fontWeight: FontWeight.bold },
  stepper: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    minHeight: 40,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: FontSize.display,
    lineHeight: FontSize.display + 8,
    fontWeight: FontWeight.bold,
    minWidth: 36,
    textAlign: 'center',
    includeFontPadding: false,
  },
  label: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.lg,
    fontWeight: FontWeight.semibold,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 54,
  },
  pickerSelected: { flex: 1, gap: 2 },
  primaryBtn: {
    marginTop: Spacing.xl,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  error: { marginTop: Spacing.sm, fontSize: FontSize.sm },
  card: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  backBtn: { marginTop: Spacing.md },
});
