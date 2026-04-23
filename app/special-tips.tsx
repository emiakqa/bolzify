import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickerGroup, PickerPlayer, PlayerPicker } from '@/components/player-picker';
import { PickerTeam, TeamPicker } from '@/components/team-picker';
import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { deName } from '@/lib/country-names';
import { supabase } from '@/lib/supabase';

const TOURNAMENT = 'WM2026';

type Slot =
  | 'champion'
  | 'runner_up'
  | 'semifinalist_a'
  | 'semifinalist_b'
  | 'top_scorer';

type TeamSlot = Exclude<Slot, 'top_scorer'>;

type State = {
  [K in TeamSlot]: PickerTeam | null;
} & { top_scorer: PickerPlayer | null };

const SLOT_CONFIG: {
  key: TeamSlot;
  label: string;
  hint: string;
}[] = [
  { key: 'champion', label: 'Weltmeister', hint: 'Wer gewinnt die WM?' },
  { key: 'runner_up', label: 'Finalgegner', hint: 'Gegen wen spielt der Weltmeister im Finale?' },
  { key: 'semifinalist_a', label: '3. Halbfinalist', hint: 'Wer verliert das eine Halbfinale?' },
  { key: 'semifinalist_b', label: '4. Halbfinalist', hint: 'Wer verliert das andere Halbfinale?' },
];

export default function SpecialTipsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  const [teams, setTeams] = useState<PickerTeam[]>([]);
  const [playerGroups, setPlayerGroups] = useState<PickerGroup[]>([]);

  const [state, setState] = useState<State>({
    champion: null,
    runner_up: null,
    semifinalist_a: null,
    semifinalist_b: null,
    top_scorer: null,
  });

  const [openPicker, setOpenPicker] = useState<Slot | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;

      // Deadline prüfen — erster Anpfiff des Turniers.
      const { data: deadlineData } = await supabase.rpc('special_tips_deadline', {
        p_tournament: TOURNAMENT,
      });
      const deadlineIso: string | null = deadlineData ?? null;
      setDeadline(deadlineIso);
      if (deadlineIso && new Date(deadlineIso).getTime() <= Date.now()) {
        setLocked(true);
      }

      // Teams des Turniers laden
      const { data: teamRows } = await supabase
        .from('teams')
        .select('id, name, code')
        .eq('tournament', TOURNAMENT);
      const pickerTeams: PickerTeam[] = teamRows ?? [];
      setTeams(pickerTeams);

      // Bestehenden Tipp laden
      const { data: tip } = await supabase
        .from('special_tips')
        .select(
          'champion_team_id, runner_up_team_id, semifinalist_a_team_id, semifinalist_b_team_id, top_scorer_player_id',
        )
        .eq('user_id', user.id)
        .eq('tournament', TOURNAMENT)
        .maybeSingle();

      const teamById = new Map(pickerTeams.map((t) => [t.id, t]));

      if (tip) {
        const newState: State = {
          champion: tip.champion_team_id ? (teamById.get(tip.champion_team_id) ?? null) : null,
          runner_up: tip.runner_up_team_id ? (teamById.get(tip.runner_up_team_id) ?? null) : null,
          semifinalist_a: tip.semifinalist_a_team_id
            ? (teamById.get(tip.semifinalist_a_team_id) ?? null)
            : null,
          semifinalist_b: tip.semifinalist_b_team_id
            ? (teamById.get(tip.semifinalist_b_team_id) ?? null)
            : null,
          top_scorer: null, // unten aufgelöst
        };
        if (tip.top_scorer_player_id) {
          const { data: p } = await supabase
            .from('players')
            .select('id, name, number, position, team_id')
            .eq('id', tip.top_scorer_player_id)
            .maybeSingle();
          if (p) newState.top_scorer = p;
        }
        setState(newState);
      }

      // Spielerliste für Torschützenkönig: alle Spieler aller Turnier-Teams,
      // gruppiert nach Team. Kann groß werden (48 Teams × 26 Spieler ≈ 1250),
      // aber einmal laden ist ok.
      if (pickerTeams.length > 0) {
        const teamIds = pickerTeams.map((t) => t.id);
        const { data: playerRows } = await supabase
          .from('players')
          .select('id, name, number, position, team_id')
          .in('team_id', teamIds)
          .order('number', { ascending: true, nullsFirst: false });

        const byTeam = new Map<number, PickerPlayer[]>();
        for (const p of playerRows ?? []) {
          const arr = byTeam.get(p.team_id) ?? [];
          arr.push(p);
          byTeam.set(p.team_id, arr);
        }
        const groups: PickerGroup[] = pickerTeams
          .map((t) => ({
            teamId: t.id,
            teamName: deName(t.name),
            players: byTeam.get(t.id) ?? [],
          }))
          .filter((g) => g.players.length > 0)
          // nach deutschem Namen sortieren, damit Picker-Reihenfolge passt
          .sort((a, b) => a.teamName.localeCompare(b.teamName, 'de'));
        setPlayerGroups(groups);
      }

      setLoading(false);
    })();
  }, [user]);

  const pickedTeamIds = useMemo(
    () =>
      (['champion', 'runner_up', 'semifinalist_a', 'semifinalist_b'] as TeamSlot[])
        .map((k) => state[k]?.id)
        .filter((id): id is number => id != null),
    [state],
  );

  const setTeamSlot = (slot: TeamSlot, team: PickerTeam | null) => {
    setState((s) => ({ ...s, [slot]: team }));
    setSaved(false);
  };

  const setTopScorer = (p: PickerPlayer | null) => {
    setState((s) => ({ ...s, top_scorer: p }));
    setSaved(false);
  };

  const submit = async () => {
    if (!user) return;
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('special_tips').upsert(
      {
        user_id: user.id,
        tournament: TOURNAMENT,
        champion_team_id: state.champion?.id ?? null,
        runner_up_team_id: state.runner_up?.id ?? null,
        semifinalist_a_team_id: state.semifinalist_a?.id ?? null,
        semifinalist_b_team_id: state.semifinalist_b?.id ?? null,
        top_scorer_player_id: state.top_scorer?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,tournament' },
    );
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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

  const deadlineText = deadline
    ? new Date(deadline).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ' · ' +
      new Date(deadline).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ThemedText style={{ color: c.textMuted }}>← Zurück</ThemedText>
        </Pressable>

        <ThemedText style={[styles.h1, { color: c.text }]}>Sondertipps</ThemedText>
        <ThemedText style={[styles.intro, { color: c.textMuted }]}>
          Einmalig vor dem Turnier tippen — Weltmeister, Finalgegner, die zwei anderen
          Halbfinalisten und den Torschützenkönig.
        </ThemedText>

        {deadlineText ? (
          <View
            style={[
              styles.deadlineBox,
              {
                backgroundColor: locked ? c.surface : c.surfaceElevated,
                borderColor: locked ? c.danger : c.border,
              },
            ]}>
            <ThemedText style={{ color: locked ? c.danger : c.textMuted, fontSize: FontSize.xs }}>
              {locked ? 'Abgabe geschlossen seit' : 'Abgabe möglich bis'}
            </ThemedText>
            <ThemedText
              style={{
                color: locked ? c.danger : c.text,
                fontSize: FontSize.sm,
                fontWeight: FontWeight.semibold,
              }}>
              {deadlineText}
            </ThemedText>
          </View>
        ) : null}

        {teams.length === 0 ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
              Noch keine Teams in der DB.{'\n'}Auslosung der WM 2026 abwarten & Fixtures
              importieren.
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>Teams</ThemedText>
            {SLOT_CONFIG.map((slot) => {
              const picked = state[slot.key];
              // Andere bereits belegte Team-IDs → dieser Slot darf sie nicht wählen.
              const othersSelected = pickedTeamIds.filter((id) => id !== picked?.id);
              return (
                <View key={slot.key} style={styles.slotWrap}>
                  <ThemedText
                    style={{ color: c.textMuted, fontSize: FontSize.xs, marginBottom: 4 }}>
                    {slot.hint}
                  </ThemedText>
                  <Pressable
                    onPress={() => !locked && setOpenPicker(slot.key)}
                    disabled={locked}
                    style={({ pressed }) => [
                      styles.slotField,
                      {
                        backgroundColor: c.surface,
                        borderColor: picked ? c.accent : c.border,
                        opacity: pressed ? 0.8 : locked ? 0.6 : 1,
                      },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={{
                          color: c.textFaint,
                          fontSize: FontSize.xs,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}>
                        {slot.label}
                      </ThemedText>
                      <ThemedText
                        style={{
                          color: picked ? c.text : c.textFaint,
                          fontSize: FontSize.md,
                          fontWeight: FontWeight.semibold,
                          marginTop: 2,
                        }}>
                        {picked ? deName(picked.name) : 'Team auswählen…'}
                      </ThemedText>
                    </View>
                    <ThemedText style={{ color: c.textMuted, fontSize: FontSize.lg }}>›</ThemedText>
                  </Pressable>
                  {openPicker === slot.key ? (
                    <TeamPicker
                      visible
                      title={slot.label}
                      teams={teams}
                      selectedId={picked?.id ?? null}
                      disabledIds={othersSelected}
                      onClose={() => setOpenPicker(null)}
                      onSelect={(t) => setTeamSlot(slot.key, t)}
                    />
                  ) : null}
                </View>
              );
            })}

            <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>
              Torschützenkönig
            </ThemedText>
            <View style={styles.slotWrap}>
              <ThemedText
                style={{ color: c.textMuted, fontSize: FontSize.xs, marginBottom: 4 }}>
                Wer wird Top-Torschütze des Turniers?
              </ThemedText>
              <Pressable
                onPress={() => !locked && playerGroups.length > 0 && setOpenPicker('top_scorer')}
                disabled={locked || playerGroups.length === 0}
                style={({ pressed }) => [
                  styles.slotField,
                  {
                    backgroundColor: c.surface,
                    borderColor: state.top_scorer ? c.accent : c.border,
                    opacity: pressed ? 0.8 : locked || playerGroups.length === 0 ? 0.6 : 1,
                  },
                ]}>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={{
                      color: c.textFaint,
                      fontSize: FontSize.xs,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}>
                    Top-Scorer
                  </ThemedText>
                  <ThemedText
                    style={{
                      color: state.top_scorer ? c.text : c.textFaint,
                      fontSize: FontSize.md,
                      fontWeight: FontWeight.semibold,
                      marginTop: 2,
                    }}>
                    {state.top_scorer
                      ? state.top_scorer.name
                      : playerGroups.length === 0
                      ? 'Noch keine Kader importiert'
                      : 'Spieler auswählen…'}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: c.textMuted, fontSize: FontSize.lg }}>›</ThemedText>
              </Pressable>
              {playerGroups.length === 0 ? (
                <ThemedText
                  style={{ color: c.textFaint, fontSize: FontSize.xs, marginTop: Spacing.xs }}>
                  Lauf `node scripts/import-squads.mjs` lokal, sobald die Kader offiziell sind.
                </ThemedText>
              ) : null}
            </View>

            <PlayerPicker
              visible={openPicker === 'top_scorer'}
              onClose={() => setOpenPicker(null)}
              onSelect={setTopScorer}
              groups={playerGroups}
              selectedId={state.top_scorer?.id ?? null}
            />

            {error ? (
              <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText>
            ) : null}

            {!locked ? (
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
                <ThemedText
                  style={{
                    color: c.accentFg,
                    fontSize: FontSize.md,
                    fontWeight: FontWeight.semibold,
                  }}>
                  {saved ? '✓ Gespeichert' : saving ? 'Speichere…' : 'Sondertipps speichern'}
                </ThemedText>
              </Pressable>
            ) : (
              <View style={[styles.lockedBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
                  Die Abgabe-Frist ist vorbei. Änderungen sind nicht mehr möglich.
                </ThemedText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: Spacing.md },
  h1: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  intro: { fontSize: FontSize.sm, marginBottom: Spacing.lg, lineHeight: 20 },
  deadlineBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 2,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  slotWrap: { marginBottom: Spacing.md },
  slotField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 64,
  },
  primaryBtn: {
    marginTop: Spacing.xl,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  error: { marginTop: Spacing.sm, fontSize: FontSize.sm },
  card: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  lockedBox: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
