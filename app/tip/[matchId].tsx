import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickerGroup, PickerPlayer, PlayerPicker } from '@/components/player-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorCard } from '@/components/ui/error-card';
import { TeamFlag } from '@/components/ui/team-flag';
import {
  Colors,
  FontSize,
  Fonts,
  LetterSpacing,
  Radius,
  Shadow,
  Spacing,
} from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { deName } from '@/lib/country-names';
import { formatCountdown, formatKickoffDate, formatKickoffTime, isBeforeKickoff } from '@/lib/format';
import { cancelReminder } from '@/lib/notifications';
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
  const [logos, setLogos] = useState<{ home: string | null; away: string | null }>({
    home: null,
    away: null,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!matchId || !user) return;
    setLoadError(null);
    setLoading(true);
    const numericId = Number(matchId);
    try {

      const { data: m } = await supabase
        .from('matches')
        .select(
          'id, tournament, kickoff_at, home_team, away_team, home_team_id, away_team_id, stage, status, home_goals, away_goals',
        )
        .eq('id', numericId)
        .maybeSingle();
      setMatch(m);

      if (m?.home_team_id && m?.away_team_id) {
        const [{ data: playerRows }, { data: teamRows }] = await Promise.all([
          supabase
            .from('players')
            .select('id, team_id, name, number, position')
            .in('team_id', [m.home_team_id, m.away_team_id])
            .order('number', { ascending: true, nullsFirst: false }),
          supabase.from('teams').select('id, logo_url').in('id', [m.home_team_id, m.away_team_id]),
        ]);

        const groups: PickerGroup[] = [
          {
            teamId: m.home_team_id,
            teamName: deName(m.home_team),
            players: (playerRows ?? []).filter((p) => p.team_id === m.home_team_id),
          },
          {
            teamId: m.away_team_id,
            teamName: deName(m.away_team),
            players: (playerRows ?? []).filter((p) => p.team_id === m.away_team_id),
          },
        ];
        setSquads(groups);

        setLogos({
          home: teamRows?.find((t) => t.id === m.home_team_id)?.logo_url ?? null,
          away: teamRows?.find((t) => t.id === m.away_team_id)?.logo_url ?? null,
        });
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
          const { data: p } = await supabase
            .from('players')
            .select('id, name, number, position')
            .eq('id', tip.first_scorer_id)
            .maybeSingle();
          if (p) setScorer(p);
        }
      }
    } catch (err) {
      console.error('[tip] load failed', err);
      setLoadError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [matchId, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

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
    try {
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
      if (err) {
        setError(err.message);
        return;
      }
      setSaved(true);
      cancelReminder(match.id).catch(() => {});
      setTimeout(() => router.back(), 600);
    } catch (err) {
      console.error('[tip] submit failed', err);
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (loadError && !match) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
              ‹ Zurück
            </Text>
          </Pressable>
          <View style={{ width: 50 }} />
        </View>
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

  if (!match) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 15 }}>
            Match nicht gefunden.
          </Text>
          <Button label="Zurück" variant="ghost" onPress={() => router.back()} />
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Top bar: Back + Stage-Badge */}
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
                ‹ Zurück
              </Text>
            </Pressable>
            {match.stage ? <Badge label={match.stage.toUpperCase()} tone="neutral" /> : <View />}
            <View style={{ width: 50 }} />
          </View>

          {/* Kickoff-Bar */}
          {tippable ? (
            <View
              style={[
                styles.kickoffBar,
                { backgroundColor: c.accentSoft, borderColor: c.accentBorder },
              ]}>
              <View style={styles.kickoffLeft}>
                <View style={[styles.dot, { backgroundColor: c.accent }]} />
                <Text
                  style={{
                    color: c.accent,
                    fontFamily: Fonts.mono.bold,
                    fontSize: 11,
                    letterSpacing: 0.6,
                  }}>
                  ANPFIFF IN
                </Text>
              </View>
              <Text
                style={{
                  color: c.accent,
                  fontFamily: Fonts.mono.bold,
                  fontSize: 14,
                  letterSpacing: 0.4,
                }}>
                {formatCountdown(match.kickoff_at, now)}
              </Text>
            </View>
          ) : null}

          {/* Score-Hero mit Stepper */}
          <Card variant="elevated" padding="lg" style={styles.scoreCard}>
            <View style={styles.scoreBlock}>
              <Stepper
                value={home}
                onIncr={() => setHome(Math.min(MAX_GOALS, home + 1))}
                onDecr={() => setHome(Math.max(0, home - 1))}
                disabled={!tippable || saving}
                c={c}
              />
              <Text style={[styles.colon, { color: c.textFaint }]}>:</Text>
              <Stepper
                value={away}
                onIncr={() => setAway(Math.min(MAX_GOALS, away + 1))}
                onDecr={() => setAway(Math.max(0, away - 1))}
                disabled={!tippable || saving}
                c={c}
              />
            </View>
            <View style={styles.teamRow}>
              <TeamLabel name={deName(match.home_team)} logo={logos.home} c={c} />
              <View style={{ width: 8 }} />
              <TeamLabel name={deName(match.away_team)} logo={logos.away} c={c} />
            </View>
          </Card>

          {/* Datum / Stadion */}
          <View style={styles.dateRow}>
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
          </View>

          {tippable ? (
            <>
              {/* Torschütze */}
              <View>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: Fonts.mono.bold,
                    fontSize: 10,
                    letterSpacing: LetterSpacing.label,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}>
                  Bonus · Erster Torschütze (+3 Pkt)
                </Text>
                <Pressable
                  onPress={() => squadsLoaded && setPickerOpen(true)}
                  disabled={!squadsLoaded || saving}
                  style={({ pressed }) => [
                    styles.pickerField,
                    {
                      backgroundColor: c.surface,
                      borderColor: scorer ? c.accentBorder : c.border,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                    },
                  ]}>
                  <View
                    style={[
                      styles.pickerAvatar,
                      { backgroundColor: scorer ? c.warmSoft : c.surfaceSunken },
                    ]}>
                    <Text
                      style={{
                        color: scorer ? c.warm : c.textFaint,
                        fontFamily: Fonts.display.bold,
                        fontSize: 12,
                      }}>
                      {scorer ? scorer.name.slice(0, 2).toUpperCase() : '+'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {scorer ? (
                      <>
                        <Text
                          style={{
                            color: c.text,
                            fontFamily: Fonts.display.bold,
                            fontSize: 15,
                            letterSpacing: -0.2,
                          }}>
                          {scorer.name}
                        </Text>
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: Fonts.mono.regular,
                            fontSize: 11,
                            letterSpacing: 0.3,
                            textTransform: 'uppercase',
                            marginTop: 1,
                          }}>
                          {scorer.number ? `#${scorer.number}` : ''}
                          {scorer.number && scorer.position ? ' · ' : ''}
                          {scorer.position ?? ''}
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: Fonts.body.medium,
                          fontSize: 14,
                        }}>
                        {squadsLoaded ? 'Spieler auswählen…' : 'Keine Kader in der DB'}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: c.textFaint, fontSize: 18 }}>›</Text>
                </Pressable>
                {!squadsLoaded ? (
                  <Text
                    style={{
                      color: c.textFaint,
                      fontFamily: Fonts.mono.regular,
                      fontSize: 11,
                      letterSpacing: 0.3,
                      marginTop: 6,
                    }}>
                    Kader nicht importiert. Lauf `node scripts/import-squads.mjs` lokal.
                  </Text>
                ) : null}
              </View>

              {/* Punkte-Erklärung */}
              <Card variant="flat" padding="md">
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: Fonts.mono.bold,
                    fontSize: 10,
                    letterSpacing: LetterSpacing.label,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}>
                  So gibt&apos;s Punkte
                </Text>
                <View style={{ gap: 6 }}>
                  {[
                    { l: 'Exakter Tipp', p: '+8' },
                    { l: 'Tordifferenz', p: '+5' },
                    { l: 'Tendenz (richtiger Sieger)', p: '+3' },
                    { l: 'Erster Torschütze', p: '+3' },
                  ].map((r) => (
                    <View key={r.l} style={styles.ruleRow}>
                      <Text
                        style={{ color: c.text, fontFamily: Fonts.body.regular, fontSize: 13 }}>
                        {r.l}
                      </Text>
                      <Text
                        style={{
                          color: c.accent,
                          fontFamily: Fonts.mono.bold,
                          fontSize: 12,
                          letterSpacing: 0.4,
                        }}>
                        {r.p} PKT
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              {error && (
                <Text style={[styles.error, { color: c.danger, fontFamily: Fonts.body.medium }]}>
                  {error}
                </Text>
              )}

              {/* Submit */}
              <Button
                label={saved ? '✓ Gespeichert' : saving ? 'Speichere…' : 'Tipp speichern'}
                onPress={submit}
                loading={saving}
                disabled={saving}
                size="lg"
                fullWidth
                variant={saved ? 'warm' : 'primary'}
                style={{ marginTop: Spacing.md }}
              />
            </>
          ) : (
            <Card padding="lg" variant="warm" style={{ marginTop: Spacing.md }}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: Fonts.body.medium,
                  fontSize: 15,
                  textAlign: 'center',
                }}>
                Anpfiff vorbei — Tipp-Abgabe gesperrt.
              </Text>
              {match.status === 'finished' &&
              match.home_goals !== null &&
              match.away_goals !== null ? (
                <Text
                  style={{
                    color: c.text,
                    fontFamily: Fonts.display.bold,
                    fontSize: 28,
                    letterSpacing: -0.5,
                    textAlign: 'center',
                    marginTop: Spacing.sm,
                  }}>
                  Endstand: {match.home_goals} : {match.away_goals}
                </Text>
              ) : null}
            </Card>
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
  value,
  onIncr,
  onDecr,
  disabled,
  c,
}: {
  value: number;
  onIncr: () => void;
  onDecr: () => void;
  disabled: boolean;
  c: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={onIncr}
        disabled={disabled || value >= MAX_GOALS}
        style={({ pressed }) => [
          styles.stepCircle,
          {
            backgroundColor: c.surface,
            opacity: pressed ? 0.6 : value >= MAX_GOALS ? 0.4 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
          Shadow.sm,
        ]}>
        <Text style={{ color: c.textMuted, fontFamily: Fonts.display.bold, fontSize: 22 }}>
          +
        </Text>
      </Pressable>
      <Text
        style={{
          color: c.text,
          fontFamily: Fonts.display.bold,
          fontSize: 88,
          letterSpacing: -3,
          lineHeight: 88,
        }}>
        {value}
      </Text>
      <Pressable
        onPress={onDecr}
        disabled={disabled || value <= 0}
        style={({ pressed }) => [
          styles.stepCircle,
          {
            backgroundColor: c.surface,
            opacity: pressed ? 0.6 : value <= 0 ? 0.4 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
          Shadow.sm,
        ]}>
        <Text style={{ color: c.textMuted, fontFamily: Fonts.display.bold, fontSize: 22 }}>
          −
        </Text>
      </Pressable>
    </View>
  );
}

function TeamLabel({
  name,
  logo,
  c,
}: {
  name: string;
  logo: string | null;
  c: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.teamLabel}>
      <TeamFlag logoUrl={logo} size={40} radius={10} />
      <Text
        style={{
          color: c.text,
          fontFamily: Fonts.display.bold,
          fontSize: 13,
          letterSpacing: -0.2,
          textAlign: 'center',
        }}
        numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kickoffBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kickoffLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  scoreCard: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  colon: {
    fontSize: 56,
    fontFamily: 'FamiljenGrotesk_700Bold',
    paddingTop: 30,
    alignSelf: 'center',
  },
  stepper: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  teamLabel: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
  },
  pickerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
