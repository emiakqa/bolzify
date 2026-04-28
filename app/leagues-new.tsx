import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
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
import { getCurrentTournament } from '@/lib/current-tournament';
import { generateInviteCode } from '@/lib/invite';
import { supabase } from '@/lib/supabase';

const MAX_INSERT_RETRIES = 3;

export default function CreateLeagueScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onCreate = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      Alert.alert('Zu kurz', 'Der Liga-Name braucht mindestens 3 Zeichen.');
      return;
    }
    if (trimmed.length > 40) {
      Alert.alert('Zu lang', 'Max 40 Zeichen.');
      return;
    }

    setSubmitting(true);

    // Liga ans aktuell aktive Turnier binden (Resolver liest aus matches).
    const tournament = await getCurrentTournament();

    // Retry bei sehr unwahrscheinlichem Code-Kollisions-Fehler (unique constraint).
    let leagueId: string | null = null;
    for (let attempt = 0; attempt < MAX_INSERT_RETRIES; attempt++) {
      const code = generateInviteCode();
      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name: trimmed,
          invite_code: code,
          created_by: user.id,
          tournament,
        })
        .select('id')
        .single();

      if (!error && data) {
        leagueId = data.id;
        break;
      }
      // 23505 = unique_violation (Postgres) → anderer Code, retry
      if (error && !error.message.toLowerCase().includes('duplicate')) {
        console.warn('league insert error:', error.message);
        Alert.alert('Fehler', error.message);
        setSubmitting(false);
        return;
      }
    }

    if (!leagueId) {
      Alert.alert('Fehler', 'Konnte keinen eindeutigen Invite-Code finden. Nochmal versuchen?');
      setSubmitting(false);
      return;
    }

    // Ersteller als Member eintragen
    const { error: memErr } = await supabase
      .from('league_members')
      .insert({ league_id: leagueId, user_id: user.id });

    if (memErr) {
      console.warn('member insert error:', memErr.message);
      Alert.alert('Fehler', memErr.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.replace({ pathname: '/leagues/[id]', params: { id: leagueId } });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
              }}>
              Abbrechen
            </ThemedText>
          </Pressable>
          <ThemedText style={[styles.title, { color: c.text }]}>Neue Liga</ThemedText>
          <View style={{ width: 72 }} />
        </View>

        <View style={styles.body}>
          <ThemedText style={[styles.label, { color: c.textFaint }]}>Liga-Name</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="z. B. Kumpels-Kader"
            placeholderTextColor={c.textFaint}
            style={[
              styles.input,
              {
                color: c.text,
                backgroundColor: c.surface,
                borderColor: name.trim().length >= 3 ? c.accentBorder : c.border,
                fontFamily: Fonts?.rounded,
              },
            ]}
            maxLength={40}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onCreate}
          />
          <ThemedText
            style={{
              color: c.textFaint,
              fontSize: FontSize.xs,
              lineHeight: LineHeight.xs,
              fontFamily: Fonts?.rounded,
              marginTop: Spacing.sm,
            }}>
            Invite-Code wird automatisch generiert. Du kannst ihn danach teilen.
          </ThemedText>

          <Button
            label={submitting ? 'Erstelle…' : 'Liga erstellen'}
            onPress={onCreate}
            disabled={submitting || name.trim().length < 3}
            loading={submitting}
            size="lg"
            fullWidth
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
  },
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm },
  label: {
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
    fontFamily: Fonts?.rounded,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.label,
    fontWeight: FontWeight.bold,
  },
  input: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    minHeight: 56,
  },
});
