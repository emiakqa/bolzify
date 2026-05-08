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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [memberTotal, setMemberTotal] = useState<number | null>(null);
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
    setErrorMsg(null);
    try {

    const { data: lg, error: lgErr } = await supabase
      .from('leagues')
      .select('id, name, invite_code, created_by')
      .eq('id', id)
      .maybeSingle();

    if (lgErr) throw new Error(`leagues select: ${lgErr.message}`);
    if (!lg) {
      setLeague(null);
      setErrorMsg(`Keine Liga mit ID ${id} sichtbar — RLS blockiert oder Liga existiert nicht.`);
      return;
    }
    setLeague(lg);

    // Hard cap auf 200 Members. Falls eine Liga das je übersteigt, sehen
    // wir's an einem Truncated-Footer und in Sentry — dann wäre Real-
    // Pagination nötig. Für MVP-Ligen (Familie, Freunde, Büro) ist 200
    // weit jenseits realistischer Größen.
    const MEMBERS_CAP = 200;
    const { data: mems, error: memErr } = await supabase
      .from('league_members')
      .select('user_id, joined_at')
      .eq('league_id', id)
      .order('joined_at')
      .limit(MEMBERS_CAP);

    if (memErr) throw new Error(`league_members select: ${memErr.message}`);

    // Wenn der Cap erreicht ist, fragen wir den echten Count separat ab,
    // damit wir dem User „X von Y" zeigen können statt zu lügen.
    let totalMembers: number | null = null;
    if ((mems ?? []).length >= MEMBERS_CAP) {
      const { count } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', id);
      totalMembers = count ?? null;
    }

    const userIds = (mems ?? []).map((m) => m.user_id);
    const profileMap = new Map<string, string>();
    const pointsMap = new Map<string, { total: number; count: number }>();

    if (userIds.length > 0) {
      // Punkte streng pro Liga filtern (per-Liga seit 0016) — sonst würden
      // wir ungewollt Punkte aus anderen Ligen mitsummieren.
      const [{ data: profiles }, { data: scored }, { data: scoredSpecial }] =
        await Promise.all([
          supabase.from('profiles').select('id, username').in('id', userIds),
          supabase
            .from('scored_tips')
            .select('user_id, total_points')
            .eq('league_id', id)
            .in('user_id', userIds),
          supabase
            .from('scored_special_tips')
            .select('user_id, total_points')
            .eq('league_id', id)
            .in('user_id', userIds),
        ]);
      for (const p of profiles ?? []) profileMap.set(p.id, p.username);
      for (const s of scored ?? []) {
        const cur = pointsMap.get(s.user_id) ?? { total: 0, count: 0 };
        cur.total += s.total_points ?? 0;
        cur.count += 1;
        pointsMap.set(s.user_id, cur);
      }
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

    enriched.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return (a.username ?? '').localeCompare(b.username ?? '');
    });

    setMembers(enriched);
    setMemberTotal(totalMembers);

    const { data: annRows, error: annErr } = await supabase
      .from('league_announcements')
      .select('id, body, created_at, author_id')
      .eq('league_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (annErr) {
      setAnnouncements([]);
    } else {
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
    } catch (err) {
      console.error('[league-detail] load failed', err);
      setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const onShare = async () => {
    if (!league) return;
    const joinUrl = `https://bolzify.app/join/${league.invite_code}`;
    try {
      await Share.share({
        message:
          `Komm in meine Bolzify-Liga "${league.name}" ⚽️\n\n` +
          `Code: ${league.invite_code}\n→ ${joinUrl}`,
      });
    } catch {
      /* user cancelled */
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
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
              ‹ Ligen
            </Text>
          </Pressable>
        </View>
        <View style={[styles.center, { padding: Spacing.xl }]}>
          <Text
            style={{
              color: c.text,
              fontFamily: Fonts.display.bold,
              fontSize: 17,
              marginBottom: Spacing.sm,
            }}>
            Liga nicht gefunden
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: Fonts.body.regular,
              fontSize: 13,
              textAlign: 'center',
            }}>
            {errorMsg ?? 'Unbekannter Fehler.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCreator = league.created_by === user?.id;
  const myIdx = members.findIndex((m) => m.user_id === user?.id);
  const myRank = myIdx >= 0 ? myIdx + 1 : null;
  const me = myIdx >= 0 ? members[myIdx] : null;
  const leader = members[0];
  const myDiff = myRank && myRank > 1 && me && leader
    ? leader.total_points - me.total_points
    : null;
  const maxPts = leader?.total_points ?? 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
            ‹ Ligen
          </Text>
        </Pressable>
        <Pressable onPress={onLeave} hitSlop={12}>
          <Text
            style={{
              color: c.danger,
              fontFamily: Fonts.body.semibold,
              fontSize: 13,
            }}>
            {isCreator ? 'Löschen' : 'Verlassen'}
          </Text>
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
          {/* Liga-Header */}
          <View>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.mono.bold,
                fontSize: 11,
                letterSpacing: LetterSpacing.label,
                textTransform: 'uppercase',
              }}>
              Liga · {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}
            </Text>
            <Text
              style={{
                color: c.text,
                fontFamily: Fonts.display.bold,
                fontSize: 30,
                lineHeight: 36,
                letterSpacing: -1,
                marginTop: 4,
              }}>
              {league.name}
            </Text>
          </View>

          {/* Mein Stand */}
          {me && myRank ? (
            <Card variant="accent" padding="md">
              <View style={styles.meRow}>
                <Text
                  style={{
                    color: c.accent,
                    fontFamily: Fonts.display.bold,
                    fontSize: 44,
                    letterSpacing: -1.5,
                    lineHeight: 44,
                  }}>
                  #{myRank}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: Fonts.display.bold,
                      fontSize: 15,
                      letterSpacing: -0.3,
                    }}>
                    Du · @{me.username ?? '—'}
                  </Text>
                  <Text
                    style={{
                      color: c.accent,
                      fontFamily: Fonts.mono.semibold,
                      fontSize: 11,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}>
                    {me.total_points} PKT
                    {myDiff !== null ? ` · ${myDiff} PKT HINTER #1` : ' · LEADER'}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          {/* Invite-Code zum Teilen */}
          <Card variant="flat" padding="md" onPress={onShare}>
            <View style={styles.codeRow}>
              <View>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: Fonts.mono.bold,
                    fontSize: 10,
                    letterSpacing: LetterSpacing.label,
                    textTransform: 'uppercase',
                  }}>
                  Invite-Code · Teilen
                </Text>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: Fonts.mono.bold,
                    fontSize: 22,
                    letterSpacing: 2,
                    marginTop: 4,
                  }}>
                  #{league.invite_code}
                </Text>
              </View>
              <Text style={{ color: c.accent, fontFamily: Fonts.body.semibold, fontSize: 13 }}>
                Teilen ›
              </Text>
            </View>
          </Card>

          {/* Ankündigungen */}
          <SectionHeader title="Ankündigungen" marginTop={Spacing.sm} />

          {isCreator ? (
            <Card padding="md">
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
                    fontFamily: Fonts.body.regular,
                    borderColor: draft.trim().length > 0 ? c.accentBorder : c.border,
                    backgroundColor: c.surfaceSunken,
                  },
                ]}
              />
              <View style={styles.composerFooter}>
                <Text
                  style={{
                    color: c.textFaint,
                    fontFamily: Fonts.mono.semibold,
                    fontSize: 11,
                    letterSpacing: 0.4,
                  }}>
                  {draft.length}/{MAX_ANNOUNCEMENT_LEN}
                </Text>
                <Button
                  label={posting ? 'Sende…' : 'Senden'}
                  onPress={postAnnouncement}
                  disabled={posting || draft.trim().length === 0}
                  loading={posting}
                  size="sm"
                />
              </View>
              {postError ? (
                <Text
                  style={{
                    color: c.danger,
                    fontFamily: Fonts.body.medium,
                    fontSize: 13,
                    marginTop: Spacing.sm,
                  }}>
                  {postError}
                </Text>
              ) : null}
            </Card>
          ) : null}

          {announcements.length === 0 ? (
            <Card padding="lg" style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: c.textFaint,
                  fontFamily: Fonts.body.regular,
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                {isCreator
                  ? 'Noch keine Nachrichten verfasst.'
                  : 'Der Spielleiter hat noch nichts gepostet.'}
              </Text>
            </Card>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {announcements.map((a) => (
                <Card key={a.id} padding="md">
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: Fonts.body.regular,
                      fontSize: 14,
                      lineHeight: 21,
                    }}>
                    {a.body}
                  </Text>
                  <View style={styles.annoMeta}>
                    <Text
                      style={{
                        color: c.textFaint,
                        fontFamily: Fonts.mono.semibold,
                        fontSize: 10,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                      }}>
                      @{a.author_username ?? '—'} · {formatRelativeTime(a.created_at)}
                    </Text>
                    {isCreator ? (
                      <Pressable onPress={() => deleteAnnouncement(a)} hitSlop={8}>
                        <Text
                          style={{
                            color: c.danger,
                            fontFamily: Fonts.body.semibold,
                            fontSize: 12,
                          }}>
                          Löschen
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Ranking-Header-Row — bei Truncation echten Total mitziehen */}
          <SectionHeader
            title={
              memberTotal && memberTotal > members.length
                ? `Tabelle · Top ${members.length} von ${memberTotal}`
                : `Tabelle · ${members.length}`
            }
            marginTop={Spacing.lg}
          />
          <View style={styles.rankHeader}>
            <Text style={[styles.rankHeaderCell, { color: c.textFaint, width: 28 }]}>#</Text>
            <Text
              style={[
                styles.rankHeaderCell,
                { color: c.textFaint, flex: 1, textAlign: 'left' },
              ]}>
              SPIELER
            </Text>
            <Text
              style={[
                styles.rankHeaderCell,
                { color: c.textFaint, minWidth: 70, textAlign: 'right' },
              ]}>
              PKT
            </Text>
          </View>

          <View>
            {members.map((m, idx) => {
              const isMe = m.user_id === user?.id;
              const isAdmin = m.user_id === league.created_by;
              const rank = idx + 1;
              const isPodium = rank <= 3;
              const pct = Math.max(0, (m.total_points / Math.max(maxPts, 1)) * 100);
              return (
                <View
                  key={m.user_id}
                  style={[
                    styles.rankRow,
                    {
                      borderTopColor: c.divider,
                      backgroundColor: isMe ? c.accentSoft : 'transparent',
                      borderRadius: isMe ? 10 : 0,
                      borderTopWidth: isMe ? 0 : 1,
                      paddingHorizontal: isMe ? 8 : 4,
                    },
                  ]}>
                  <Text
                    style={{
                      color: isPodium ? c.accent : c.textMuted,
                      fontFamily: Fonts.display.bold,
                      fontSize: 18,
                      letterSpacing: -0.5,
                      width: 28,
                      textAlign: 'center',
                    }}>
                    {rank}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text
                        style={{
                          color: c.text,
                          fontFamily: Fonts.display.bold,
                          fontSize: 14,
                          letterSpacing: -0.2,
                        }}
                        numberOfLines={1}>
                        @{m.username ?? '—'}
                      </Text>
                      {isAdmin ? <Badge label="ADMIN" tone="accent" /> : null}
                    </View>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: Fonts.mono.regular,
                        fontSize: 10,
                        letterSpacing: 0.3,
                        marginTop: 2,
                        textTransform: 'uppercase',
                      }}>
                      {m.scored_count === 0
                        ? 'noch keine Tipps gewertet'
                        : `${m.scored_count} TIPP${m.scored_count === 1 ? '' : 'S'} GEWERTET`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: Fonts.display.bold,
                        fontSize: 17,
                        letterSpacing: -0.3,
                        lineHeight: 18,
                      }}>
                      {m.total_points}
                    </Text>
                    <View style={[styles.pctBar, { backgroundColor: c.surfaceSunken }]}>
                      <View
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: isMe ? c.accent : c.textMuted,
                          opacity: isMe ? 1 : 0.5,
                        }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
            {memberTotal && memberTotal > members.length ? (
              <View style={{ paddingTop: Spacing.md, alignItems: 'center' }}>
                <Text
                  style={{
                    color: c.textFaint,
                    fontFamily: Fonts.mono.semibold,
                    fontSize: 11,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}>
                  + {memberTotal - members.length} weitere
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.jumbo,
    gap: Spacing.md,
  },
  meRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  composerInput: {
    minHeight: 80,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: 'top',
    marginBottom: Spacing.sm,
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
  rankHeader: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
  },
  rankHeaderCell: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  rankRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pctBar: {
    height: 3,
    borderRadius: 999,
    marginTop: 4,
    overflow: 'hidden',
    width: 60,
  },
});
