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
import { isValidInviteCode, normalizeInviteCode } from '@/lib/invite';
import { supabase } from '@/lib/supabase';

export default function JoinLeagueScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeInviteCode(code);
  const valid = isValidInviteCode(normalized);

  const onJoin = async () => {
    if (!user || !valid) return;
    setSubmitting(true);

    // RPC macht Lookup + Member-Insert atomar, umgeht die leagues-select-RLS
    // (die Membership voraussetzt — ein Join-Aspirant ist ja per Def noch keins).
    const { data, error } = await supabase
      .rpc('join_league_by_code', { p_code: normalized });

    setSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes('code not found')) {
        Alert.alert('Code nicht gefunden', 'Prüfe den Code nochmal — 6 Zeichen, Groß/Klein egal.');
      } else {
        Alert.alert('Fehler', error.message);
      }
      return;
    }

    const leagueId = Array.isArray(data) ? data[0]?.league_id : (data as { league_id?: string })?.league_id;
    if (!leagueId) {
      Alert.alert('Fehler', 'Liga konnte nicht geöffnet werden.');
      return;
    }

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
          <ThemedText style={[styles.title, { color: c.text }]}>Liga beitreten</ThemedText>
          <View style={{ width: 72 }} />
        </View>

        <View style={styles.body}>
          <ThemedText style={[styles.label, { color: c.textFaint }]}>Invite-Code</ThemedText>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="ABC23X"
            placeholderTextColor={c.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onJoin}
            style={[
              styles.input,
              {
                color: c.text,
                backgroundColor: c.surface,
                borderColor: valid ? c.accentBorder : c.border,
                fontFamily: Fonts?.rounded,
              },
            ]}
          />
          <ThemedText
            style={{
              color: c.textFaint,
              fontSize: FontSize.xs,
              lineHeight: LineHeight.xs,
              fontFamily: Fonts?.rounded,
              marginTop: Spacing.sm,
            }}>
            6 Zeichen, Buchstaben + Zahlen. Vom Liga-Admin zugeschickt.
          </ThemedText>

          <Button
            label={submitting ? 'Trete bei…' : 'Beitreten'}
            onPress={onJoin}
            disabled={!valid || submitting}
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
    borderWidth: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    letterSpacing: 4,
    textAlign: 'center',
    minHeight: 72,
  },
});
