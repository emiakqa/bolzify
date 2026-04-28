import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
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
import { formatRelativeTime } from '@/lib/format';
import { isAppAdmin, sendBroadcast } from '@/lib/inbox';
import { supabase } from '@/lib/supabase';

const MAX_BODY = 2000;

type Past = {
  id: string;
  body: string;
  created_at: string;
};

export default function BroadcastNewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [past, setPast] = useState<Past[]>([]);

  // Admin-Check + Recipient-Count + History gleichzeitig laden
  useEffect(() => {
    if (!user) return;
    (async () => {
      const ok = await isAppAdmin(user.id);
      setAllowed(ok);
      if (!ok) return;
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      setRecipientCount(count ?? 0);
    })();
  }, [user]);

  const loadPast = useCallback(async () => {
    if (!user || !allowed) return;
    const { data } = await supabase
      .from('broadcasts')
      .select('id, body, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    setPast((data ?? []) as Past[]);
  }, [user, allowed]);

  useFocusEffect(
    useCallback(() => {
      loadPast();
    }, [loadPast]),
  );

  const onSend = () => {
    if (!user) return;
    const body = draft.trim();
    if (body.length === 0) return;
    Alert.alert(
      'Broadcast senden?',
      `Diese Nachricht geht an ${recipientCount ?? 'alle'} User. Nicht rückgängig machbar.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Senden',
          style: 'default',
          onPress: async () => {
            setError(null);
            setSending(true);
            try {
              await sendBroadcast(user.id, body);
              setDraft('');
              await loadPast();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Fehler beim Senden');
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  const onDelete = (b: Past) => {
    Alert.alert(
      'Broadcast löschen?',
      'Die Inbox-Items der User bleiben bestehen, nur der Broadcast-Audit-Eintrag wird entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            const prev = past;
            setPast((arr) => arr.filter((x) => x.id !== b.id));
            const { error: err } = await supabase.from('broadcasts').delete().eq('id', b.id);
            if (err) {
              setPast(prev);
              Alert.alert('Fehler', err.message);
            }
          },
        },
      ],
    );
  };

  if (allowed === null) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  if (!allowed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
              }}>
              ← Zurück
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.center}>
          <ThemedText
            style={{
              color: c.text,
              fontFamily: Fonts?.rounded,
              fontSize: FontSize.md,
              lineHeight: LineHeight.md,
              textAlign: 'center',
              paddingHorizontal: Spacing.xl,
            }}>
            Nur App-Admins können Broadcasts senden.
          </ThemedText>
          <ThemedText
            style={{
              color: c.textFaint,
              fontFamily: Fonts?.rounded,
              fontSize: FontSize.sm,
              lineHeight: LineHeight.sm,
              textAlign: 'center',
              paddingHorizontal: Spacing.xl,
              marginTop: Spacing.sm,
            }}>
            Im Supabase-SQL-Editor:{'\n'}
            insert into app_admins (user_id) values ({"'"}deine-user-uuid{"'"});
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
              }}>
              ← Zurück
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.h1, { color: c.text }]}>Broadcast</ThemedText>
          <ThemedText
            style={{
              color: c.textMuted,
              fontSize: FontSize.sm,
              lineHeight: LineHeight.sm,
              fontFamily: Fonts?.rounded,
              marginBottom: Spacing.lg,
            }}>
            Geht ins Postfach von{' '}
            <ThemedText style={{ color: c.text, fontWeight: FontWeight.semibold }}>
              {recipientCount ?? '…'} Usern
            </ThemedText>
            . Verwende es sparsam — Update-Ankündigungen, Wartungsfenster, wichtige Hinweise.
          </ThemedText>

          <Card padding="md" style={{ gap: Spacing.sm }}>
            <TextInput
              value={draft}
              onChangeText={(t) => {
                if (t.length <= MAX_BODY) setDraft(t);
              }}
              placeholder="Nachricht an alle User…"
              placeholderTextColor={c.textFaint}
              multiline
              editable={!sending}
              style={[
                styles.input,
                {
                  color: c.text,
                  fontFamily: Fonts?.rounded,
                  borderColor: draft.trim().length > 0 ? c.accentBorder : c.border,
                  backgroundColor: c.surface,
                },
              ]}
            />
            <View style={styles.footer}>
              <ThemedText
                style={{
                  color: c.textFaint,
                  fontSize: FontSize.xs,
                  lineHeight: LineHeight.xs,
                  fontFamily: Fonts?.rounded,
                }}>
                {draft.length}/{MAX_BODY}
              </ThemedText>
              <Button
                label={sending ? 'Sende…' : 'An alle senden'}
                onPress={onSend}
                disabled={sending || draft.trim().length === 0}
                loading={sending}
                size="md"
              />
            </View>
            {error ? (
              <ThemedText
                style={{
                  color: c.danger,
                  fontSize: FontSize.sm,
                  lineHeight: LineHeight.sm,
                  fontFamily: Fonts?.rounded,
                }}>
                {error}
              </ThemedText>
            ) : null}
          </Card>

          <SectionHeader title={`Verlauf (${past.length})`} marginTop={Spacing.lg} />
          {past.length === 0 ? (
            <Card padding="md" style={{ alignItems: 'center' }}>
              <ThemedText
                style={{
                  color: c.textFaint,
                  fontFamily: Fonts?.rounded,
                  fontSize: FontSize.sm,
                  lineHeight: LineHeight.sm,
                }}>
                Noch keine Broadcasts gesendet.
              </ThemedText>
            </Card>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {past.map((b) => (
                <Card key={b.id} padding="md" onLongPress={() => onDelete(b)}>
                  <ThemedText
                    style={{
                      color: c.text,
                      fontSize: FontSize.md,
                      lineHeight: LineHeight.md,
                      fontFamily: Fonts?.rounded,
                    }}>
                    {b.body}
                  </ThemedText>
                  <ThemedText
                    style={{
                      color: c.textFaint,
                      fontSize: FontSize.xs,
                      lineHeight: LineHeight.xs,
                      fontFamily: Fonts?.rounded,
                      marginTop: Spacing.xs,
                    }}>
                    {formatRelativeTime(b.created_at)} · long-press zum Löschen
                  </ThemedText>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  h1: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    marginBottom: Spacing.sm,
  },
  input: {
    minHeight: 120,
    maxHeight: 280,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
