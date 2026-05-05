import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickerGroup, PickerPlayer, PlayerPicker } from '@/components/player-picker';
import { PickerTeam, TeamPicker } from '@/components/team-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorCard } from '@/components/ui/error-card';
import { TeamFlag } from '@/components/ui/team-flag';
import {
  Colors,
  Fonts,
  LetterSpacing,
  Radius,
  Shadow,
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
  | `group:${string}`;

type TeamSlot = Exclude<Slot, 'top_scorer'>;

type State = {
  [K in TeamSlot]: PickerTeam | null;
} & { top_scorer: PickerPlayer | null };

const SLOT_CONFIG: { key: TeamSlot; label: string }[] = [
  { key: 'champion', label: 'Weltmeister' },
  { key: 'runner_up', label: 'Finalgegner' },
  { key: 'semifinalist_a', label: '3. Halbfinalist' },
  { key: 'semifinalist_b', label: '4. Halbfinalist' },
];

type Tab = 'top' | 'groups';

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
  const [now, setNow] = useState(Date.now());

  const [tab, setTab] = useState<Tab>('top');
  const [teams, setTeams] = useState<PickerTeam[]>([]);
  const [logos, setLogos] = useState<Map<number, string>>(new Map());
  const [playerGroups, setPlayerGroups] = useState<PickerGroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupPicks, setGroupPicks] = useState<Record<string, PickerTeam | null>>({});
  const [tournament, setTournament] = useState<string | null>(null);

  const [state, setState] = useState<State>({
    champion: null,
    runner_up: null,
    semifinalist_a: null,
    semifinalist_b: null,
    top_scorer: null,
  });

  const [openPicker, setOpenPicker] = useState<Slot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    setLoading(true);
    try {
      const t = await getCurrentTournament();
      setTournament(t);

      const { data: deadlineData } = await supabase.rpc('special_tips_deadline', {
        p_tournament: t,
      });
      const deadlineIso: string | null = deadlineData ?? null;
      setDeadline(deadlineIso);
      if (deadlineIso && new Date(deadlineIso).getTime() <= Date.now()) {
        setLocked(true);
      }

      const { data: teamRows } = await supabase
        .from('teams')
        .select('id, name, code, logo_url')
        .eq('tournament', t);
      const pickerTeams: PickerTeam[] = (teamRows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
      }));
      setTeams(pickerTeams);

      const logoMap = new Map<number, string>();
      for (const r of teamRows ?? []) {
        if (r.logo_url) logoMap.set(r.id, r.logo_url);
      }
      setLogos(logoMap);

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
          top_scorer: null,
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
        const playerGrps: PickerGroup[] = pickerTeams
          .map((t) => ({
            teamId: t.id,
            teamName: deName(t.name),
            players: byTeam.get(t.id) ?? [],
          }))
          .filter((g) => g.players.length > 0)
          .sort((a, b) => a.teamName.localeCompare(b.teamName, 'de'));
        setPlayerGroups(playerGrps);
      }
    } catch (err) {
      console.error('[special-tips] load failed', err);
      setLoadError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Countdown live updaten
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pickedTeamIds = useMemo(
    () =>
      (['champion', 'runner_up', 'semifinalist_a', 'semifinalist_b'] as TeamSlot[])
        .map((k) => state[k]?.id)
        .filter((id): id is number => id != null),
    [state],
  );

  const filledCount = useMemo(() => {
    const top = SLOT_CONFIG.filter((s) => state[s.key] != null).length;
    const top_scorer = state.top_scorer ? 1 : 0;
    const grps = Object.values(groupPicks).filter((v) => v != null).length;
    return top + top_scorer + grps;
  }, [state, groupPicks]);

  const totalCount = SLOT_CONFIG.length + 1 + groups.length;

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
    try {
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
        setError(err.message);
        return;
      }

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
          setError(upErr.message);
          return;
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error('[special-tips] submit failed', err);
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (loadError && !tournament) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingWrap, { padding: Spacing.lg }]}>
          <ErrorCard message={loadError} onRetry={load} />
        </View>
      </SafeAreaView>
    );
  }

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

  // Deadline-Countdown
  const deadlineDelta = deadline ? new Date(deadline).getTime() - now : null;
  const deadlineCountdown = (() => {
    if (deadlineDelta === null) return null;
    if (deadlineDelta <= 0) return 'JETZT';
    const days = Math.floor(deadlineDelta / 86_400_000);
    const hours = Math.floor((deadlineDelta % 86_400_000) / 3_600_000);
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((deadlineDelta % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
  })();
  const deadlineDateText = deadline
    ? new Date(deadline).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) +
      ' · ' +
      new Date(deadline).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
            ← Zurück
          </Text>
        </Pressable>

        {/* Headline */}
        <View>
          <Text
            style={{
              color: c.warm,
              fontFamily: Fonts.mono.bold,
              fontSize: 11,
              letterSpacing: LetterSpacing.label,
              textTransform: 'uppercase',
            }}>
            ★ Sondertipps · {filledCount}/{totalCount}
          </Text>
          <Text
            style={{
              color: c.text,
              fontSize: 32,
              lineHeight: 38,
              fontFamily: Fonts.display.bold,
              letterSpacing: -1,
              marginTop: 4,
            }}>
            Tippe das Turnier
          </Text>
        </View>

        {/* Deadline-Pill */}
        {deadlineDateText ? (
          <Card
            variant={locked ? 'flat' : 'warm'}
            padding="sm"
            style={styles.deadlineBox}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: locked ? c.danger : c.warm,
                  fontFamily: Fonts.mono.bold,
                  fontSize: 10,
                  letterSpacing: LetterSpacing.label,
                  textTransform: 'uppercase',
                }}>
                {locked ? 'Geschlossen' : 'Abgabe bis'}
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: Fonts.display.bold,
                  fontSize: 16,
                  letterSpacing: -0.3,
                  marginTop: 1,
                }}>
                {deadlineDateText}
              </Text>
            </View>
            {!locked && deadlineCountdown ? (
              <Text
                style={{
                  color: c.warm,
                  fontFamily: Fonts.mono.bold,
                  fontSize: 14,
                  letterSpacing: 0.5,
                }}>
                {deadlineCountdown}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Sub-Tab Pill-Switcher */}
        <View style={[styles.tabSwitch, { backgroundColor: c.surfaceSunken, borderColor: c.border }]}>
          {(
            [
              { k: 'top' as Tab, l: 'Top-Tipps' },
              { k: 'groups' as Tab, l: 'Gruppensieger' },
            ]
          ).map((opt) => {
            const active = tab === opt.k;
            return (
              <Pressable
                key={opt.k}
                onPress={() => setTab(opt.k)}
                style={[
                  styles.tabBtn,
                  active
                    ? { backgroundColor: c.surface, ...Shadow.sm }
                    : null,
                ]}>
                <Text
                  style={{
                    color: active ? c.text : c.textMuted,
                    fontFamily: Fonts.display.bold,
                    fontSize: 13,
                    letterSpacing: -0.2,
                  }}>
                  {opt.l}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {teams.length === 0 ? (
          <Card padding="lg" style={styles.emptyCard}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 15,
                lineHeight: 22,
                textAlign: 'center',
              }}>
              Noch keine Teams in der DB.{'\n'}Auslosung der WM 2026 abwarten & Fixtures importieren.
            </Text>
          </Card>
        ) : tab === 'top' ? (
          <>
            {/* 2x2 Slot-Grid für Top-Tipps */}
            <View style={styles.grid}>
              {SLOT_CONFIG.map((slot) => {
                const picked = state[slot.key];
                const othersSelected = pickedTeamIds.filter((id) => id !== picked?.id);
                return (
                  <View key={slot.key} style={styles.gridCell}>
                    <SlotCard
                      label={slot.label}
                      teamName={picked ? deName(picked.name) : null}
                      logoUrl={picked ? logos.get(picked.id) ?? null : null}
                      onPress={() => !locked && setOpenPicker(slot.key)}
                      disabled={locked}
                      c={c}
                    />
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
            </View>

            {/* Top-Scorer als prominente Card */}
            <Card variant="flat" padding="md">
              <Text
                style={{
                  color: c.warm,
                  fontFamily: Fonts.mono.bold,
                  fontSize: 10,
                  letterSpacing: LetterSpacing.label,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}>
                ⚽ Torschützenkönig
              </Text>
              <Pressable
                onPress={() => !locked && playerGroups.length > 0 && setOpenPicker('top_scorer')}
                disabled={locked || playerGroups.length === 0}
                style={({ pressed }) => [
                  styles.scorerRow,
                  {
                    opacity: pressed ? 0.85 : locked || playerGroups.length === 0 ? 0.6 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.scorerNum,
                    { backgroundColor: state.top_scorer ? c.warmSoft : c.surfaceSunken },
                  ]}>
                  <Text
                    style={{
                      color: state.top_scorer ? c.warm : c.textFaint,
                      fontFamily: Fonts.display.bold,
                      fontSize: 18,
                    }}>
                    {state.top_scorer?.number ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  {state.top_scorer ? (
                    <>
                      <Text
                        style={{
                          color: c.text,
                          fontFamily: Fonts.display.bold,
                          fontSize: 17,
                          letterSpacing: -0.3,
                        }}>
                        {state.top_scorer.name}
                      </Text>
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: Fonts.mono.regular,
                          fontSize: 11,
                          letterSpacing: 0.4,
                          marginTop: 1,
                          textTransform: 'uppercase',
                        }}>
                        {state.top_scorer.position ?? 'Spieler'}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: Fonts.body.medium,
                        fontSize: 15,
                      }}>
                      {playerGroups.length === 0 ? 'Noch keine Kader importiert' : 'Spieler wählen…'}
                    </Text>
                  )}
                </View>
                <Text style={{ color: c.textFaint, fontSize: 18 }}>›</Text>
              </Pressable>
            </Card>

            <PlayerPicker
              visible={openPicker === 'top_scorer'}
              onClose={() => setOpenPicker(null)}
              onSelect={setTopScorer}
              groups={playerGroups}
              selectedId={state.top_scorer?.id ?? null}
            />
          </>
        ) : (
          /* Tab: Gruppensieger */
          groups.length === 0 ? (
            <Card padding="lg" style={styles.emptyCard}>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: Fonts.body.regular,
                  fontSize: 14,
                  lineHeight: 22,
                  textAlign: 'center',
                }}>
                Gruppen erscheinen, sobald die Auslosung importiert ist.{'\n'}
                Lauf `node scripts/import-team-groups.mjs` lokal.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {groups.map((g) => {
                const slotKey: Slot = `group:${g.letter}`;
                const picked = groupPicks[g.letter];
                return (
                  <View key={g.letter}>
                    <Pressable
                      onPress={() => !locked && setOpenPicker(slotKey)}
                      disabled={locked}
                      style={({ pressed }) => [
                        styles.groupRow,
                        {
                          backgroundColor: c.surface,
                          borderColor: picked ? c.accentBorder : c.border,
                          opacity: pressed ? 0.85 : locked ? 0.6 : 1,
                          transform: [{ scale: pressed && !locked ? 0.99 : 1 }],
                        },
                        Shadow.sm,
                      ]}>
                      <View style={[styles.groupBadge, { backgroundColor: c.accentSoft }]}>
                        <Text
                          style={{
                            color: c.accent,
                            fontFamily: Fonts.display.bold,
                            fontSize: 18,
                            letterSpacing: -0.3,
                          }}>
                          {g.letter}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: Fonts.mono.bold,
                            fontSize: 10,
                            letterSpacing: LetterSpacing.label,
                            textTransform: 'uppercase',
                          }}>
                          Gruppe {g.letter}
                        </Text>
                        <Text
                          style={{
                            color: picked ? c.text : c.textFaint,
                            fontFamily: Fonts.display.bold,
                            fontSize: 15,
                            letterSpacing: -0.3,
                            marginTop: 1,
                          }}>
                          {picked ? deName(picked.name) : 'Sieger wählen…'}
                        </Text>
                      </View>
                      {picked ? (
                        <TeamFlag logoUrl={logos.get(picked.id) ?? null} size={28} />
                      ) : null}
                      <Text style={{ color: c.textFaint, fontSize: 18 }}>›</Text>
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
              })}
            </View>
          )
        )}

        {error ? (
          <Text style={{ color: c.danger, fontFamily: Fonts.body.medium, fontSize: 13 }}>
            {error}
          </Text>
        ) : null}

        {!locked && teams.length > 0 ? (
          <View style={{ gap: 6, marginTop: Spacing.md }}>
            <Button
              label={saved ? '✓ Gespeichert' : saving ? 'Speichere…' : 'Sondertipps speichern'}
              onPress={submit}
              loading={saving}
              disabled={saving}
              size="lg"
              fullWidth
              variant={saved ? 'warm' : 'primary'}
            />
            <Text
              style={{
                color: c.textFaint,
                fontFamily: Fonts.mono.semibold,
                fontSize: 10,
                letterSpacing: 0.6,
                textAlign: 'center',
                marginTop: 4,
              }}>
              BIS ZUR DEADLINE BELIEBIG OFT ÄNDERBAR
            </Text>
          </View>
        ) : locked ? (
          <Card padding="lg" style={{ marginTop: Spacing.md }}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 14,
                lineHeight: 22,
                textAlign: 'center',
              }}>
              Die Abgabe-Frist ist vorbei. Änderungen sind nicht mehr möglich.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SlotCard({
  label,
  teamName,
  logoUrl,
  onPress,
  disabled,
  c,
}: {
  label: string;
  teamName: string | null;
  logoUrl: string | null;
  onPress: () => void;
  disabled: boolean;
  c: (typeof Colors)['light'];
}) {
  const filled = teamName != null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.slotCard,
        {
          backgroundColor: c.surface,
          borderColor: filled ? c.accentBorder : c.border,
          opacity: pressed ? 0.85 : disabled ? 0.6 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        Shadow.sm,
      ]}>
      <Text
        style={{
          color: filled ? c.accent : c.textFaint,
          fontFamily: Fonts.mono.bold,
          fontSize: 9,
          letterSpacing: LetterSpacing.label,
          textTransform: 'uppercase',
        }}>
        {label}
      </Text>
      {filled ? (
        <>
          <TeamFlag logoUrl={logoUrl} size={36} />
          <Text
            numberOfLines={1}
            style={{
              color: c.text,
              fontFamily: Fonts.display.bold,
              fontSize: 15,
              letterSpacing: -0.3,
            }}>
            {teamName}
          </Text>
        </>
      ) : (
        <>
          <View style={styles.slotFlagEmpty}>
            <Text style={{ color: c.textFaint, fontSize: 22, fontFamily: Fonts.display.regular }}>
              +
            </Text>
          </View>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: Fonts.body.medium,
              fontSize: 13,
            }}>
            Team wählen…
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: Spacing.xs },
  deadlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tabSwitch: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  emptyCard: { alignItems: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCell: {
    width: '48%',
    flexGrow: 1,
  },
  slotCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    minHeight: 120,
  },
  slotFlagEmpty: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scorerNum: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  groupBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
