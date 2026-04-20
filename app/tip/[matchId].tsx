import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { formatKickoffDate, formatKickoffTime, isBeforeKickoff } from '@/lib/format';
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
  const [firstScorer, setFirstScorer] = useState('');
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
        .select('id, kickoff_at, home_team, away_team, stage, status, home_goals, away_goals')
        .eq('id', numericId)
        .maybeSingle();
      setMatch(m);

      const { data: tip } = await supabase
        .from('tips')
        .select('home_goals, away_goals, first_scorer')
        .eq('user_id', user.id)
        .eq('match_id', numericId)
        .maybeSingle();

      if (tip) {
        setHome(tip.home_goals);
        setAway(tip.away_goals);
        setFirstScorer(tip.first_scorer ?? '');
      }
      setLoading(false);
    })();
  }, [matchId, user]);

  const tippable = match ? isBeforeKickoff(match.kickoff_at) : false;

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
        first_scorer: firstScorer.trim() || null,
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
              <TextInput
                style={[
                  styles.input,
                  { color: c.text, backgroundColor: c.surface, borderColor: c.border },
                ]}
                placeholder="z.B. Musiala"
                placeholderTextColor={c.textFaint}
                value={firstScorer}
                onChangeText={setFirstScorer}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
              />

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
  colon: { fontSize: FontSize.display, fontWeight: FontWeight.bold },
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
    fontWeight: FontWeight.bold,
    minWidth: 36,
    textAlign: 'center',
  },
  label: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.lg,
    fontWeight: FontWeight.semibold,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
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
