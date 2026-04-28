import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/lib/supabase';

type LeagueDetail = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
};

type Member = {
  user_id: string;
  joined_at: string;
  username: string | null;
  total_points: number;
  scored_count: number;
};

type Announcement = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_username: string | null;
};

const MAX_ANNOUNCEMENT_LEN = 1000;

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setErrorMsg('Keine Liga-ID im Route-Param.');
      setLoading(false);
      return;
    }

    // Sequentiell, damit ein members-Fehler den league-Lookup nicht kaputtmacht.
    const { data: lg, error: lgErr } = await supabase
      .from('leagues')
      .select('id, name, invite_code, created_by')
      .eq('id', id)
      .maybeSingle();

    if (lgErr) {
      console.warn('league load error:', lgErr.message);
      setLeague(null);
      setErrorMsg(`leagues select: ${lgErr.message}`);
      setLoading(false);
      return;
    }
    if (!lg) {
      setLeague(null);
      setErrorMsg(`Keine Liga mit ID ${id} sichtbar — RLS blockiert oder Liga existiert nicht.`);
      setLoading(false);
      return;
    }
    setLeague(lg);
    setErrorMsg(null);

    const { data: mems, error: memErr } = await supabase
      .from('league_members')
      .select('user_id, joined_at')
      .eq('league_id', id)
      .order('joined_at');

    if (memErr) {
      console.warn('members load error:', memErr.message);
      setMembers([]);
      setErrorMsg(`league_members select: ${memErr.message}`);
      setLoading(false);
      return;
    }

    // Usernames + Punkte in zwei parallelen Batches.
    const userIds = (mems ?? []).map((m) => m.user_id);
    const profileMap = new Map<string, string>();
    const pointsMap = new Map<string, { total: number; count: number }>();

    if (userIds.length > 0) {
      // scored_special_tips parallel mit holen — RLS lässt fremde Rows erst
      // nach Sondertipp-Deadline (Turnierstart) durch, vorher kommen nur die
      // eigenen zurück. Vor der WM also nur self → Liga-Ranking zeigt 0
      // Sondertipp-Punkte für andere, das ist die intendierte Lock-Phase.
      const [{ data: profiles }, { data: scored }, { data: scoredSpecial }] =
        await Promise.all([
          supabase.from('profiles').select('id, username').in('id', userIds),
          supabase
            .from('scored_tips')
            .select('user_id, total_points')
            .in('user_id', userIds),
          supabase
            .from('scored_special_tips')
            .select('user_id, total_points')
            .in('user_id', userIds),
        ]);
      for (const p of profiles ?? []) profileMap.set(p.id, p.username);
      for (const s of scored ?? []) {
        const cur = pointsMap.get(s.user_id) ?? { total: 0, count: 0 };
        cur.total += s.total_points ?? 0;
        cur.count += 1;
        pointsMap.set(s.user_id, cur);
      }
      // scored_count zählen wir bewusst NICHT für Sondertipps mit — der
      // „N Tipps gewertet"-Subtitle bezieht sich nur auf Match-Tipps.
      for (const s of scoredSpecial ?? []) {
        const cur = pointsMap.get(s.user_id) ?? { total: 0, count: 0 };
        cur.total += s.total_points ?? 0;
        pointsMap.set(s.user_id, cur);
      }
    }

    const enriched = (mems ?? []).map((m) => {
      const pts = pointsMap.get(m.user_id) ?? { total: 0, count: 0 };
      return {
        user_id: m.user_id,
        joined_at: m.joined_at,
        username: profileMap.get(m.user_id) ?? null,
        total_points: pts.total,
        scored_count: pts.count,
      };
    });

    // Ranking: höchste Punkte zuerst, bei Gleichstand alphabetisch
    enriched.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return (a.username ?? '').localeCompare(b.username ?? '');
    });

    setMembers(enriched);

    // Ankündigungen laden — separat, schlägt nicht durch wenn Migration
    // 0011 noch nicht ausgeführt wurde (UI zeigt dann einfach leere Liste).
    const { data: annRows, error: annErr } = await supabase
      .from('league_announcements')
      .select('id, body, created_at, author_id')
      .eq('league_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (annErr) {
      // Wahrscheinlich: Tabelle existiert noch nicht (Migration 0011 fehlt)
      // → leise schlucken, Loglevel info statt warn.
      console.info('announcements load skipped:', annErr.message);
      setAnnouncements([]);
    } else {
      // Author-Usernames anreichern. profileMap haben wir oben für Members
      // aufgebaut, aber Author kann eine Person sein, die nicht (mehr)
      // Mitglied ist (z.B. Liga-Admin, der nur Ersteller, nicht Member ist).
      // Daher fehlende Profile separat nachladen.
      const missing = (annRows ?? [])
        .map((a) => a.author_id)
        .filter((aid) => !profileMap.has(aid));
      if (missing.length > 0) {
        const uniq = Array.from(new Set(missing));
        const { data: extra } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', uniq);
        for (const p of extra ?? []) profileMap.set(p.id, p.username);
      }
      setAnnouncements(
        (annRows ?? []).map((a) => ({
          id: a.id,
          body: a.body,
          created_at: a.created_at,
          author_id: a.author_id,
          author_username: profileMap.get(a.author_id) ?? null,
        })),
      );
    }

    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onShare = async () => {
    if (!league) return;
    const joinUrl = `https://bolzify.app/join/${league.invite_code}`;
    try {
      await Share.share({
        message:
          `Komm in meine Bolzify-Liga "${league.name}" \u26BD\uFE0F\n\n` +
          `Code: ${league.invite_code}\n` +
          `\u2192 ${joinUrl}`,
      });
    } catch {
      // silent — user hat abgebrochen
    }
  };

  const postAnnouncement = async () => {
    if (!league || !user) return;
    const body = draft.trim();
    if (body.length === 0) return;
    if (body.length > MAX_ANNOUNCEMENT_LEN) {
      setPostError(`Maximal ${MAX_ANNOUNCEMENT_LEN} Zeichen.`);
      return;
    }
    setPostError(null);
    setPosting(true);
    const { data, error } = await supabase
      .from('league_announcements')
      .insert({ league_id: league.id, author_id: user.id, body })
      .select('id, body, created_at, author_id')
      .single();
    setPosting(false);
    if (error || !data) {
      setPostError(error?.message ?? 'Senden fehlgeschlagen.');
      return;
    }
    // Optimistic prepend — kein Reload nötig.
    setAnnouncements((prev) => [
      {
        id: data.id,
        body: data.body,
        created_at: data.created_at,
        author_id: data.author_id,
        author_username:
          members.find((m) => m.user_id === user.id)?.username ?? null,
      },
      ...prev,
    ]);
    setDraft('');
  };

  const deleteAnnouncement = (a: Announcement) => {
    Alert.alert('Nachricht löschen?', 'Das kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          const prev = announcements;
          setAnnouncements((arr) => arr.filter((x) => x.id !== a.id));
          const { error } = await supabase
            .from('league_announcements')
            .delete()
            .eq('id', a.id);
          if (error) {
            // Rollback bei Fehler
            setAnnouncements(prev);
            Alert.alert('Fehler', error.message);
          }
        },
      },
    ]);
  };

  const onLeave = () => {
    if (!league || !user) return;
    const isCreator = league.created_by === user.id;
    Alert.alert(
      isCreator ? 'Liga löschen?' : 'Liga verlassen?',
      isCreator
        ? 'Als Ersteller löschst du die Liga für alle Mitglieder. Das ist endgültig.'
        : 'Du kannst später mit dem Code wieder beitreten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: isCreator ? 'Löschen' : 'Verlassen',
          style: 'destructive',
          onPress: async () => {
            if (isCreator) {
              const { error } = await supabase.from('leagues').delete().eq('id', league.id);
              if (error) {
                Alert.alert('Fehler', error.message);
                return;
              }
            } else {
              const { error } = await supabase
                .from('league_members')
                .delete()
                .eq('league_id', league.id)
                .eq('user_id', user.id);
              if (error) {
                Alert.alert('Fehler', error.message);
                return;
              }
            }
            router.back();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={c.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  if (!league) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
              }}>
              ‹ Zurück
            </ThemedText>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>
        <View style={[styles.center, { padding: Spacing.xl }]}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.md,
              lineHeight: LineHeight.md,
              fontFamily: Fonts?.rounded,
              fontWeight: FontWeight.semibold,
              marginBottom: Spacing.sm,
            }}>
            Liga nicht gefunden
          </ThemedText>
          <ThemedText
            style={{
              color: c.textMuted,
              textAlign: 'center',
              fontSize: FontSize.sm,
              lineHeight: LineHeight.sm,
              fontFamily: Fonts?.rounded,
            }}>
            {errorMsg ?? 'Unbekannter Fehler.'}
          </ThemedText>
          <ThemedText
            style={{
              color: c.textFaint,
              textAlign: 'center',
              fontSize: FontSize.xs,
              lineHeight: LineHeight.xs,
              fontFamily: Fonts?.rounded,
              marginTop: Spacing.lg,
            }}>
            Hinweis: Ausstehende Migrations im Supabase SQL-Editor ausführen:{'\n'}
            0003_fix_rls_recursion.sql · 0005_league_join.sql
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const isCreator = league.created_by === user?.id;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText
            style={{
              color: c.textMuted,
              fontSize: FontSize.md,
              lineHeight: LineHeight.md,
              fontFamily: Fonts?.rounded,
            }}>
            ‹ Zurück
          </ThemedText>
        </Pressable>
        <Pressable onPress={onLeave} hitSlop={12}>
          <ThemedText
            style={{
              color: c.danger,
              fontSize: FontSize.sm,
              lineHeight: LineHeight.sm,
              fontFamily: Fonts?.rounded,
              fontWeight: FontWeight.semibold,
            }}>
            {isCreator ? 'Löschen' : 'Verlassen'}
          </ThemedText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }>
        <ThemedText style={[styles.title, { color: c.text }]}>{league.name}</ThemedText>

        <Card variant="accent" padding="lg" onPress={onShare} style={styles.codeCard}>
          <ThemedText
            style={{
              color: c.accent,
              fontSize: FontSize.xs,
              lineHeight: LineHeight.xs,
              fontFamily: Fonts?.rounded,
              fontWeight: FontWeight.bold,
              textTransform: 'uppercase',
              letterSpacing: LetterSpacing.label,
            }}>
            Invite-Code · Tippen zum Teilen
          </ThemedText>
          <ThemedText
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.code, { color: c.accent }]}>
            {league.invite_code}
          </ThemedText>
        </Card>

        <SectionHeader title="Ankündigungen" marginTop={Spacing.lg} />

        {isCreator ? (
          <Card padding="md" style={styles.composerCard}>
            <TextInput
              value={draft}
              onChangeText={(t) => {
                if (t.length <= MAX_ANNOUNCEMENT_LEN) setDraft(t);
              }}
              placeholder="Nachricht an alle Mitglieder…"
              placeholderTextColor={c.textFaint}
              multiline
              editable={!posting}
              style={[
                styles.composerInput,
                {
                  color: c.text,
                  fontFamily: Fonts?.rounded,
                  borderColor: draft.trim().length > 0 ? c.accentBorder : c.border,
                  backgroundColor: c.surface,
                },
              ]}
            />
            <View style={styles.composerFooter}>
              <ThemedText
                style={{
                  color: c.textFaint,
                  fontSize: FontSize.xs,
                  lineHeight: LineHeight.xs,
                  fontFamily: Fonts?.rounded,
                }}>
                {draft.length}/{MAX_ANNOUNCEMENT_LEN}
              </ThemedText>
              <Button
                label={posting ? 'Sende…' : 'Senden'}
                onPress={postAnnouncement}
                disabled={posting || draft.trim().length === 0}
                loading={posting}
                size="sm"
              />
            </View>
            {postError ? (
              <ThemedText
                style={{
                  color: c.danger,
                  fontSize: FontSize.sm,
                  lineHeight: LineHeight.sm,
                  fontFamily: Fonts?.rounded,
                  marginTop: Spacing.sm,
                }}>
                {postError}
              </ThemedText>
            ) : null}
          </Card>
        ) : null}

        {announcements.length === 0 ? (
          <Card padding="lg" style={{ alignItems: 'center' }}>
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.sm,
                lineHeight: LineHeight.sm,
                fontFamily: Fonts?.rounded,
                textAlign: 'center',
              }}>
              {isCreator
                ? 'Noch keine Nachrichten verfasst.'
                : 'Der Spielleiter hat noch nichts gepostet.'}
            </ThemedText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {announcements.map((a) => (
              <Card key={a.id} padding="md">
                <ThemedText
                  style={{
                    color: c.text,
                    fontSize: FontSize.md,
                    lineHeight: LineHeight.md,
                    fontFamily: Fonts?.rounded,
                  }}>
                  {a.body}
                </ThemedText>
                <View style={styles.annoMeta}>
                  <ThemedText
                    style={{
                      color: c.textFaint,
                      fontSize: FontSize.xs,
                      lineHeight: LineHeight.xs,
                      fontFamily: Fonts?.rounded,
                    }}>
                    @{a.author_username ?? '—'} · {formatRelativeTime(a.created_at)}
                  </ThemedText>
                  {isCreator ? (
                    <Pressable onPress={() => deleteAnnouncement(a)} hitSlop={8}>
                      <ThemedText
                        style={{
                          color: c.danger,
                          fontSize: FontSize.xs,
                          lineHeight: LineHeight.xs,
                          fontFamily: Fonts?.rounded,
                          fontWeight: FontWeight.semibold,
                        }}>
                        Löschen
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )}

        <SectionHeader title={`Ranking (${members.length})`} marginTop={Spacing.lg} />

        <View style={{ gap: Spacing.sm }}>
          {members.map((m, idx) => {
            const isMe = m.user_id === user?.id;
            const isAdmin = m.user_id === league.created_by;
            const rank = idx + 1;
            return (
              <Card
                key={m.user_id}
                variant={isMe ? 'accent' : 'default'}
                padding="md">
                <View style={styles.memberRow}>
                  <ThemedText
                    style={[
                      styles.rank,
                      {
                        color: rank <= 3 ? c.accent : c.textFaint,
                        fontFamily: Fonts?.rounded,
                      },
                    ]}>
                    {rank}
                  </ThemedText>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <ThemedText
                        style={{
                          color: c.text,
                          fontSize: FontSize.md,
                          lineHeight: LineHeight.md,
                          fontFamily: Fonts?.rounded,
                          fontWeight: FontWeight.semibold,
                        }}
                        numberOfLines={1}>
                        @{m.username ?? '—'}
                        {isMe ? ' (du)' : ''}
                      </ThemedText>
                      {isAdmin ? <Badge label="Admin" tone="accent" /> : null}
                    </View>
                    <ThemedText
                      style={{
                        color: c.textMuted,
                        fontSize: FontSize.xs,
                        lineHeight: LineHeight.xs,
                        fontFamily: Fonts?.rounded,
                        marginTop: 2,
                      }}>
                      {m.scored_count === 0
                        ? 'noch keine Tipps gewertet'
                        : `${m.scored_count} Tipp${m.scored_count === 1 ? '' : 's'} gewertet`}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.points,
                      {
                        color: c.text,
                        fontFamily: Fonts?.rounded,
                      },
                    ]}>
                    {m.total_points}
                  </ThemedText>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo, gap: Spacing.md },
  title: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    marginBottom: Spacing.sm,
  },
  codeCard: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  code: {
    fontSize: FontSize.display,
    lineHeight: LineHeight.display,
    fontFamily: Fonts?.rounded,
    fontWeight: FontWeight.heavy,
    letterSpacing: 3,
    includeFontPadding: false,
    paddingHorizontal: Spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rank: {
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.heavy,
    minWidth: 28,
    textAlign: 'center',
  },
  points: {
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.heavy,
    minWidth: 44,
    textAlign: 'right',
  },
  composerCard: {
    gap: Spacing.sm,
  },
  composerInput: {
    minHeight: 80,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  annoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
});
