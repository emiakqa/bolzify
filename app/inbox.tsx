import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Colors,
  FontSize,
  FontWeight,
  Fonts,
  LetterSpacing,
  LineHeight,
  Spacing,
} from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { formatRelativeTime } from '@/lib/format';
import { InboxItem, deleteItem, loadInbox, markAllRead, markRead } from '@/lib/inbox';

export default function InboxScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const list = await loadInbox(user.id);
    setItems(list);
    setLoading(false);
  }, [user]);

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

  const onItemPress = async (item: InboxItem) => {
    // Optimistic mark read
    if (!item.read_at) {
      setItems((arr) =>
        arr.map((x) => (x.id === item.id ? { ...x, read_at: new Date().toISOString() } : x)),
      );
      markRead(item.id).catch(() => {});
    }
    // Bei Liga-Ankündigung: in die Liga springen
    if (item.kind === 'league_announcement' && item.league_id) {
      router.push(`/leagues/${item.league_id}`);
    }
  };

  const onItemLongPress = (item: InboxItem) => {
    Alert.alert('Nachricht löschen?', undefined, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          const prev = items;
          setItems((arr) => arr.filter((x) => x.id !== item.id));
          try {
            await deleteItem(item.id);
          } catch {
            setItems(prev);
          }
        },
      },
    ]);
  };

  const onMarkAllRead = async () => {
    if (!user) return;
    setItems((arr) => arr.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    await markAllRead(user.id);
  };

  const unreadCount = items.filter((i) => !i.read_at).length;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

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
        {unreadCount > 0 ? (
          <Pressable onPress={onMarkAllRead} hitSlop={10}>
            <ThemedText
              style={{
                color: c.accent,
                fontSize: FontSize.sm,
                lineHeight: LineHeight.sm,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
              }}>
              Alle gelesen
            </ThemedText>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }>
        <ThemedText style={[styles.h1, { color: c.text }]}>
          Postfach
          {unreadCount > 0 ? (
            <ThemedText style={{ color: c.accent }}> · {unreadCount} neu</ThemedText>
          ) : null}
        </ThemedText>

        {items.length === 0 ? (
          <Card padding="lg" style={styles.emptyCard}>
            <ThemedText
              style={{
                color: c.textFaint,
                fontFamily: Fonts?.rounded,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                textAlign: 'center',
              }}>
              Noch keine Nachrichten.{'\n'}Spielleiter und Bolzify-Team posten hier.
            </ThemedText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {items.map((item) => {
              const unread = !item.read_at;
              const sourceLabel =
                item.kind === 'broadcast'
                  ? 'Bolzify-Team'
                  : `Liga · ${item.league_name_snapshot ?? '—'}`;
              return (
                <Card
                  key={item.id}
                  padding="md"
                  variant={unread ? 'accent' : 'default'}
                  onPress={() => onItemPress(item)}
                  onLongPress={() => onItemLongPress(item)}>
                  <View style={styles.itemHeader}>
                    <View style={styles.sourceRow}>
                      {item.kind === 'broadcast' ? (
                        <Badge label="Team" tone="accent" />
                      ) : null}
                      <ThemedText
                        style={{
                          color: c.textMuted,
                          fontSize: FontSize.xs,
                          lineHeight: LineHeight.xs,
                          fontFamily: Fonts?.rounded,
                          fontWeight: FontWeight.bold,
                          textTransform: 'uppercase',
                          letterSpacing: LetterSpacing.label,
                          flex: 1,
                        }}
                        numberOfLines={1}>
                        {sourceLabel}
                      </ThemedText>
                    </View>
                    {unread ? <View style={[styles.unreadDot, { backgroundColor: c.accent }]} /> : null}
                  </View>
                  <ThemedText
                    style={{
                      color: c.text,
                      fontSize: FontSize.md,
                      lineHeight: LineHeight.md,
                      fontFamily: Fonts?.rounded,
                      marginTop: Spacing.xs,
                    }}>
                    {item.body}
                  </ThemedText>
                  <ThemedText
                    style={{
                      color: c.textFaint,
                      fontSize: FontSize.xs,
                      lineHeight: LineHeight.xs,
                      fontFamily: Fonts?.rounded,
                      marginTop: Spacing.sm,
                    }}>
                    @{item.sender_username_snapshot ?? '—'} ·{' '}
                    {formatRelativeTime(item.created_at)}
                  </ThemedText>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  h1: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    marginBottom: Spacing.lg,
  },
  emptyCard: { alignItems: 'center' },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sourceRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
