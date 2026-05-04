import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Colors,
  Fonts,
  LetterSpacing,
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
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
              ‹ Zurück
            </Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text
            style={{
              color: c.text,
              fontFamily: Fonts.display.bold,
              fontSize: 17,
              textAlign: 'center',
              paddingHorizontal: Spacing.xl,
            }}>
            Nur App-Admins können Broadcasts senden.
          </Text>
          <Text
            style={{
              color: c.textFaint,
              fontFamily: Fonts.mono.regular,
              fontSize: 11,
              lineHeight: 18,
              letterSpacing: 0.4,
              textAlign: 'center',
              paddingHorizontal: Spacing.xl,
              marginTop: Spacing.sm,
            }}>
            Im Supabase-SQL-Editor:{'\n'}
            insert into app_admins (user_id) values ({"'"}deine-user-uuid{"'"});
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = MAX_BODY - draft.length;
  const canSend = !sending && draft.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        {/* Top bar mit Senden-Action rechts */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
              Abbrechen
            </Text>
          </Pressable>
          <Text style={{ color: c.text, fontFamily: Fonts.display.bold, fontSize: 15 }}>
            Broadcast
          </Text>
          <Pressable onPress={onSend} disabled={!canSend} hitSlop={12}>
            <Text
              style={{
                color: canSend ? c.accent : c.textFaint,
                fontFamily: Fonts.display.bold,
                fontSize: 14,
              }}>
              {sending ? 'Sende…' : 'Senden'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* "AN"-Audience-Card */}
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
              An
            </Text>
            <Card variant="flat" padding="sm">
              <View style={styles.audienceRow}>
                <View style={[styles.audienceIcon, { backgroundColor: c.accentSoft }]}>
                  <Text style={{ color: c.accent, fontFamily: Fonts.display.bold, fontSize: 12 }}>
                    BZ
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: Fonts.display.bold,
                      fontSize: 14,
                      letterSpacing: -0.2,
                    }}>
                    Alle Bolzify-User
                  </Text>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: Fonts.mono.semibold,
                      fontSize: 10,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}>
                    {recipientCount ?? '…'} EMPFÄNGER
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Nachricht */}
          <View>
            <View style={styles.msgHeader}>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: Fonts.mono.bold,
                  fontSize: 10,
                  letterSpacing: LetterSpacing.label,
                  textTransform: 'uppercase',
                }}>
                Nachricht
              </Text>
              <Text
                style={{
                  color: remaining < 100 ? c.warm : c.textFaint,
                  fontFamily: Fonts.mono.semibold,
                  fontSize: 10,
                  letterSpacing: 0.4,
                }}>
                {draft.length} / {MAX_BODY}
              </Text>
            </View>
            <Card variant="flat" padding="md" style={{ minHeight: 180 }}>
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
                    fontFamily: Fonts.body.regular,
                  },
                ]}
              />
            </Card>
            {error ? (
              <Text
                style={{
                  color: c.danger,
                  fontFamily: Fonts.body.medium,
                  fontSize: 13,
                  marginTop: Spacing.sm,
                }}>
                {error}
              </Text>
            ) : null}
          </View>

          {/* Verlauf */}
          <SectionHeader title={`Verlauf · ${past.length}`} marginTop={Spacing.lg} />
          {past.length === 0 ? (
            <Card padding="md" style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: c.textFaint,
                  fontFamily: Fonts.body.regular,
                  fontSize: 13,
                }}>
                Noch keine Broadcasts gesendet.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {past.map((b) => (
                <Card key={b.id} padding="md" onLongPress={() => onDelete(b)}>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: Fonts.body.regular,
                      fontSize: 14,
                      lineHeight: 21,
                    }}>
                    {b.body}
                  </Text>
                  <Text
                    style={{
                      color: c.textFaint,
                      fontFamily: Fonts.mono.semibold,
                      fontSize: 10,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      marginTop: 6,
                    }}>
                    {formatRelativeTime(b.created_at)} · LONG-PRESS ZUM LÖSCHEN
                  </Text>
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
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo, gap: Spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audienceIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  input: {
    minHeight: 160,
    maxHeight: 280,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
    borderRadius: Radius.md,
  },
});
