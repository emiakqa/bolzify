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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Group, getTournamentGroups } from '@/lib/groups';
import { supabase } from '@/lib/supabase';

type Slot =
  | 'champion'
  | 'runner_up'
  | 'semifinalist_a'
  | 'semifinalist_b'
  | 'top_scorer'
  // 'group:A' .. 'group:L' — dynamisch, daher als template-literal type.
  | `group:${string}`;

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
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupPicks, setGroupPicks] = useState<Record<string, PickerTeam | null>>({});
  // Aktives Turnier wird zur Laufzeit resolvt (nicht hardcoded), damit der
  // Screen sich automatisch auf zukünftige Turniere umstellt.
  const [tournament, setTournament] = useState<string | null>(null);

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

      const t = await getCurrentTournament();
      setTournament(t);

      // Deadline prüfen — erster Anpfiff des Turniers.
      const { data: deadlineData } = await supabase.rpc('special_tips_deadline', {
        p_tournament: t,
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
        .eq('tournament', t);
      const pickerTeams: PickerTeam[] = teamRows ?? [];
      setTeams(pickerTeams);

      // Gruppen ableiten + bestehende Gruppensieger-Tipps laden
      const grps = await getTournamentGroups(t);
      setGroups(grps);

      const initialGroupPicks: Record<string, PickerTeam | null> = {};
      for (const g of grps) initialGroupPicks[g.letter] = null;

      if (grps.length > 0) {
        const teamById = new Map(pickerTeams.map((tm) => [tm.id, tm]));
        const { data: gwTips } = await supabase
          .from('group_winner_tips')
          .select('group_letter, team_id')
          .eq('user_id', user.id)
          .eq('tournament', t);
        for (const row of gwTips ?? []) {
          initialGroupPicks[row.group_letter] = teamById.get(row.team_id) ?? null;
        }
      }
      setGroupPicks(initialGroupPicks);

      // Bestehenden Tipp laden
      const { data: tip } = await supabase
        .from('special_tips')
        .select(
          'champion_team_id, runner_up_team_id, semifinalist_a_team_id, semifinalist_b_team_id, top_scorer_player_id',
        )
        .eq('user_id', user.id)
        .eq('tournament', t)
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

  const setGroupPick = (letter: string, team: PickerTeam | null) => {
    setGroupPicks((p) => ({ ...p, [letter]: team }));
    setSaved(false);
  };

  const submit = async () => {
    if (!user || !tournament) return;
    setError(null);
    setSaving(true);

    const { error: err } = await supabase.from('special_tips').upsert(
      {
        user_id: user.id,
        tournament,
        champion_team_id: state.champion?.id ?? null,
        runner_up_team_id: state.runner_up?.id ?? null,
        semifinalist_a_team_id: state.semifinalist_a?.id ?? null,
        semifinalist_b_team_id: state.semifinalist_b?.id ?? null,
        top_scorer_player_id: state.top_scorer?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,tournament' },
    );

    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }

    // Gruppensieger-Tipps: leere Slots löschen, gefüllte upserten.
    // Wir machen es in zwei separaten Statements statt einem Diff, weil
    // das simpler ist und Postgres das problemlos abkann.
    const filledLetters = Object.keys(groupPicks).filter((l) => groupPicks[l]);
    const emptyLetters = Object.keys(groupPicks).filter((l) => !groupPicks[l]);

    if (emptyLetters.length > 0) {
      const { error: delErr } = await supabase
        .from('group_winner_tips')
        .delete()
        .eq('user_id', user.id)
        .eq('tournament', tournament)
        .in('group_letter', emptyLetters);
      if (delErr) {
        setSaving(false);
        setError(delErr.message);
        return;
      }
    }

    if (filledLetters.length > 0) {
      const rows = filledLetters.map((letter) => ({
        user_id: user.id,
        tournament,
        group_letter: letter,
        team_id: groupPicks[letter]!.id,
        updated_at: new Date().toISOString(),
      }));
      const { error: upErr } = await supabase
        .from('group_winner_tips')
        .upsert(rows, { onConflict: 'user_id,tournament,group_letter' });
      if (upErr) {
        setSaving(false);
        setError(upErr.message);
        return;
      }
    }

    setSaving(false);
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ThemedText
            style={{ color: c.textMuted, fontFamily: Fonts?.rounded, fontSize: FontSize.md }}>
            ← Zurück
          </ThemedText>
        </Pressable>

        <ThemedText style={[styles.h1, { color: c.text }]}>Sondertipps</ThemedText>
        <ThemedText style={[styles.intro, { color: c.textMuted }]}>
          Einmalig vor dem Turnier tippen — Weltmeister, Finalgegner, die zwei anderen
          Halbfinalisten, den Torschützenkönig und alle Gruppensieger.
        </ThemedText>

        {deadlineText ? (
          <Card
            variant={locked ? 'default' : 'accent'}
            padding="md"
            style={{
              ...styles.deadlineBox,
              ...(locked ? { borderColor: c.danger } : {}),
            }}>
            <ThemedText
              style={{
                color: locked ? c.danger : c.accent,
                fontSize: FontSize.xs,
                lineHeight: LineHeight.xs,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: LetterSpacing.label,
              }}>
              {locked ? 'Abgabe geschlossen seit' : 'Abgabe möglich bis'}
            </ThemedText>
            <ThemedText
              style={{
                color: locked ? c.danger : c.text,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
                marginTop: 2,
              }}>
              {deadlineText}
            </ThemedText>
          </Card>
        ) : null}

        {teams.length === 0 ? (
          <Card padding="lg" style={styles.emptyCard}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontFamily: Fonts?.rounded,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                textAlign: 'center',
              }}>
              Noch keine Teams in der DB.{'\n'}Auslosung der WM 2026 abwarten & Fixtures
              importieren.
            </ThemedText>
          </Card>
        ) : (
          <>
            <ThemedText style={[styles.sectionLabel, { color: c.textMuted }]}>Teams</ThemedText>
            {SLOT_CONFIG.map((slot) => {
              const picked = state[slot.key];
              // Andere bereits belegte Team-IDs → dieser Slot darf sie nicht wählen.
              const othersSelected = pickedTeamIds.filter((id) => id !== picked?.id);
              return (
                <View key={slot.key} style={styles.slotWrap}>
                  <ThemedText
                    style={{
                      color: c.textMuted,
                      fontSize: FontSize.xs,
                      lineHeight: LineHeight.xs,
                      fontFamily: Fonts?.rounded,
                      marginBottom: 6,
                    }}>
                    {slot.hint}
                  </ThemedText>
                  <Pressable
                    onPress={() => !locked && setOpenPicker(slot.key)}
                    disabled={locked}
                    style={({ pressed }) => [
                      styles.slotField,
                      {
                        backgroundColor: c.surface,
                        borderColor: picked ? c.accentBorder : c.border,
                        opacity: pressed ? 0.85 : locked ? 0.6 : 1,
                        transform: [{ scale: pressed && !locked ? 0.99 : 1 }],
                      },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={{
                          color: c.textFaint,
                          fontSize: FontSize.xs,
                          lineHeight: LineHeight.xs,
                          fontFamily: Fonts?.rounded,
                          fontWeight: FontWeight.bold,
                          textTransform: 'uppercase',
                          letterSpacing: LetterSpacing.label,
                        }}>
                        {slot.label}
                      </ThemedText>
                      <ThemedText
                        style={{
                          color: picked ? c.text : c.textFaint,
                          fontSize: FontSize.md,
                          lineHeight: LineHeight.md,
                          fontFamily: Fonts?.rounded,
                          fontWeight: FontWeight.semibold,
                          marginTop: 2,
                        }}>
                        {picked ? deName(picked.name) : 'Team auswählen…'}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={{
                        color: c.textMuted,
                        fontSize: FontSize.lg,
                        lineHeight: LineHeight.lg,
                        fontFamily: Fonts?.rounded,
                      }}>
                      ›
                    </ThemedText>
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

            <ThemedText style={[styles.sectionLabel, { color: c.textMuted }]}>
              Torschützenkönig
            </ThemedText>
            <View style={styles.slotWrap}>
              <ThemedText
                style={{
                  color: c.textMuted,
                  fontSize: FontSize.xs,
                  lineHeight: LineHeight.xs,
                  fontFamily: Fonts?.rounded,
                  marginBottom: 6,
                }}>
                Wer wird Top-Torschütze des Turniers?
              </ThemedText>
              <Pressable
                onPress={() => !locked && playerGroups.length > 0 && setOpenPicker('top_scorer')}
                disabled={locked || playerGroups.length === 0}
                style={({ pressed }) => [
                  styles.slotField,
                  {
                    backgroundColor: c.surface,
                    borderColor: state.top_scorer ? c.accentBorder : c.border,
                    opacity: pressed ? 0.85 : locked || playerGroups.length === 0 ? 0.6 : 1,
                    transform: [
                      { scale: pressed && !locked && playerGroups.length > 0 ? 0.99 : 1 },
                    ],
                  },
                ]}>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={{
                      color: c.textFaint,
                      fontSize: FontSize.xs,
                      lineHeight: LineHeight.xs,
                      fontFamily: Fonts?.rounded,
                      fontWeight: FontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: LetterSpacing.label,
                    }}>
                    Top-Scorer
                  </ThemedText>
                  <ThemedText
                    style={{
                      color: state.top_scorer ? c.text : c.textFaint,
                      fontSize: FontSize.md,
                      lineHeight: LineHeight.md,
                      fontFamily: Fonts?.rounded,
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
                <ThemedText
                  style={{
                    color: c.textMuted,
                    fontSize: FontSize.lg,
                    lineHeight: LineHeight.lg,
                    fontFamily: Fonts?.rounded,
                  }}>
                  ›
                </ThemedText>
              </Pressable>
              {playerGroups.length === 0 ? (
                <ThemedText
                  style={{
                    color: c.textFaint,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                    fontFamily: Fonts?.rounded,
                    marginTop: Spacing.xs,
                  }}>
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

            <ThemedText style={[styles.sectionLabel, { color: c.textMuted }]}>
              Gruppensieger
            </ThemedText>
            {groups.length === 0 ? (
              <Card padding="md" style={styles.emptyCard}>
                <ThemedText
                  style={{
                    color: c.textFaint,
                    fontFamily: Fonts?.rounded,
                    fontSize: FontSize.sm,
                    lineHeight: LineHeight.sm,
                    textAlign: 'center',
                  }}>
                  Gruppen erscheinen, sobald die Auslosung importiert ist.
                </ThemedText>
              </Card>
            ) : (
              groups.map((g) => {
                const slotKey: Slot = `group:${g.letter}`;
                const picked = groupPicks[g.letter];
                return (
                  <View key={g.letter} style={styles.slotWrap}>
                    <Pressable
                      onPress={() => !locked && setOpenPicker(slotKey)}
                      disabled={locked}
                      style={({ pressed }) => [
                        styles.slotField,
                        {
                          backgroundColor: c.surface,
                          borderColor: picked ? c.accentBorder : c.border,
                          opacity: pressed ? 0.85 : locked ? 0.6 : 1,
                          transform: [{ scale: pressed && !locked ? 0.99 : 1 }],
                        },
                      ]}>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          style={{
                            color: c.textFaint,
                            fontSize: FontSize.xs,
                            lineHeight: LineHeight.xs,
                            fontFamily: Fonts?.rounded,
                            fontWeight: FontWeight.bold,
                            textTransform: 'uppercase',
                            letterSpacing: LetterSpacing.label,
                          }}>
                          Gruppe {g.letter}
                        </ThemedText>
                        <ThemedText
                          style={{
                            color: picked ? c.text : c.textFaint,
                            fontSize: FontSize.md,
                            lineHeight: LineHeight.md,
                            fontFamily: Fonts?.rounded,
                            fontWeight: FontWeight.semibold,
                            marginTop: 2,
                          }}>
                          {picked ? deName(picked.name) : 'Sieger auswählen…'}
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={{
                          color: c.textMuted,
                          fontSize: FontSize.lg,
                          lineHeight: LineHeight.lg,
                          fontFamily: Fonts?.rounded,
                        }}>
                        ›
                      </ThemedText>
                    </Pressable>
                    {openPicker === slotKey ? (
                      <TeamPicker
                        visible
                        title={`Gruppe ${g.letter} — Sieger`}
                        teams={g.teams}
                        selectedId={picked?.id ?? null}
                        onClose={() => setOpenPicker(null)}
                        onSelect={(t) => setGroupPick(g.letter, t)}
                      />
                    ) : null}
                  </View>
                );
              })
            )}

            {error ? (
              <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText>
            ) : null}

            {!locked ? (
              <Button
                label={saved ? '✓ Gespeichert' : saving ? 'Speichere…' : 'Sondertipps speichern'}
                onPress={submit}
                loading={saving}
                disabled={saving}
                size="lg"
                fullWidth
                style={{
                  marginTop: Spacing.xl,
                  backgroundColor: saved ? c.success : c.accent,
                }}
              />
            ) : (
              <Card padding="lg" style={styles.lockedBox}>
                <ThemedText
                  style={{
                    color: c.textMuted,
                    fontSize: FontSize.md,
                    lineHeight: LineHeight.md,
                    fontFamily: Fonts?.rounded,
                    textAlign: 'center',
                  }}>
                  Die Abgabe-Frist ist vorbei. Änderungen sind nicht mehr möglich.
                </ThemedText>
              </Card>
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
  h1: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.bold,
    fontFamily: Fonts?.rounded,
    marginBottom: Spacing.sm,
  },
  intro: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontFamily: Fonts?.rounded,
    marginBottom: Spacing.lg,
  },
  deadlineBox: {
    marginBottom: Spacing.lg,
    gap: 2,
  },
  emptyCard: {
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
    fontFamily: Fonts?.rounded,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.label,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  slotWrap: { marginBottom: Spacing.md },
  slotField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 64,
  },
  error: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontFamily: Fonts?.rounded,
  },
  lockedBox: {
    marginTop: Spacing.xl,
  },
});
