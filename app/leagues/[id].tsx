import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
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

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
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
      const [{ data: profiles }, { data: scored }] = await Promise.all([
        supabase.from('profiles').select('id, username').in('id', userIds),
        supabase.from('scored_tips').select('user_id, total_points').in('user_id', userIds),
      ]);
      for (const p of profiles ?? []) profileMap.set(p.id, p.username);
      for (const s of scored ?? []) {
        const cur = pointsMap.get(s.user_id) ?? { total: 0, count: 0 };
        cur.total += s.total_points ?? 0;
        cur.count += 1;
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
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.md }}>‹ Zurück</ThemedText>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>
        <View style={[styles.center, { padding: Spacing.xl }]}>
          <ThemedText style={{ color: c.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm }}>
            Liga nicht gefunden
          </ThemedText>
          <ThemedText style={{ color: c.textMuted, textAlign: 'center', fontSize: FontSize.sm }}>
            {errorMsg ?? 'Unbekannter Fehler.'}
          </ThemedText>
          <ThemedText style={{ color: c.textFaint, textAlign: 'center', fontSize: FontSize.xs, marginTop: Spacing.lg }}>
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
          <ThemedText style={{ color: c.textMuted, fontSize: FontSize.md }}>‹ Zurück</ThemedText>
        </Pressable>
        <Pressable onPress={onLeave} hitSlop={12}>
          <ThemedText style={{ color: c.danger, fontSize: FontSize.sm }}>
            {isCreator ? 'Löschen' : 'Verlassen'}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />}>
        <ThemedText style={[styles.title, { color: c.text }]}>{league.name}</ThemedText>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.codeCard,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText style={[styles.codeLabel, { color: c.textFaint }]}>Invite-Code · Tippen zum Teilen</ThemedText>
          <ThemedText
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.code, { color: c.accent }]}>
            {league.invite_code}
          </ThemedText>
        </Pressable>

        <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>
          Ranking ({members.length})
        </ThemedText>

        {members.map((m, idx) => {
          const isMe = m.user_id === user?.id;
          const isAdmin = m.user_id === league.created_by;
          const rank = idx + 1;
          return (
            <View
              key={m.user_id}
              style={[
                styles.memberRow,
                {
                  backgroundColor: isMe ? c.surfaceElevated : c.surface,
                  borderColor: isMe ? c.accent : c.border,
                },
              ]}>
              <ThemedText style={[styles.rank, { color: rank <= 3 ? c.accent : c.textFaint }]}>
                {rank}
              </ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: c.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold }}>
                  @{m.username ?? '—'}{isMe ? ' (du)' : ''}
                </ThemedText>
                <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                  {m.scored_count === 0
                    ? (isAdmin ? 'Admin · noch keine Tipps gewertet' : 'noch keine Tipps gewertet')
                    : `${m.scored_count} Tipp${m.scored_count === 1 ? '' : 's'} gewertet${isAdmin ? ' · Admin' : ''}`}
                </ThemedText>
              </View>
              <ThemedText style={[styles.points, { color: c.text }]}>
                {m.total_points}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>
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
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  codeCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  codeLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeight.semibold,
  },
  code: {
    fontSize: FontSize.display,
    lineHeight: FontSize.display + 8,
    fontWeight: FontWeight.bold,
    letterSpacing: 3,
    includeFontPadding: false,
    paddingHorizontal: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.lg,
  },
  memberRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rank: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    minWidth: 28,
    textAlign: 'center',
  },
  points: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    minWidth: 44,
    textAlign: 'right',
  },
});
