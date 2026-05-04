import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import {
  Colors,
  Fonts,
  LetterSpacing,
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
    if (!item.read_at) {
      setItems((arr) =>
        arr.map((x) => (x.id === item.id ? { ...x, read_at: new Date().toISOString() } : x)),
      );
      markRead(item.id).catch(() => {});
    }
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
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
            ‹ Zurück
          </Text>
        </Pressable>
        {unreadCount > 0 ? (
          <Pressable onPress={onMarkAllRead} hitSlop={10}>
            <Text style={{ color: c.accent, fontFamily: Fonts.body.semibold, fontSize: 13 }}>
              Alle gelesen
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
        }>
        <View style={styles.headerBlock}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: Fonts.mono.bold,
              fontSize: 11,
              letterSpacing: LetterSpacing.label,
              textTransform: 'uppercase',
            }}>
            {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alles gelesen'}
          </Text>
          <Text
            style={{
              color: c.text,
              fontFamily: Fonts.display.bold,
              fontSize: 32,
              lineHeight: 38,
              letterSpacing: -1,
              marginTop: 4,
            }}>
            Postfach
          </Text>
        </View>

        {items.length === 0 ? (
          <Card padding="lg" style={styles.emptyCard}>
            <Text
              style={{
                color: c.textFaint,
                fontFamily: Fonts.body.regular,
                fontSize: 14,
                lineHeight: 22,
                textAlign: 'center',
              }}>
              Noch keine Nachrichten.{'\n'}Spielleiter und Bolzify-Team posten hier.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {items.map((item) => {
              const unread = !item.read_at;
              const isBroadcast = item.kind === 'broadcast';
              const sourceLabel = isBroadcast
                ? 'Bolzify-Team'
                : item.league_name_snapshot ?? '—';
              const sender = item.sender_username_snapshot ?? '—';
              const initials = (sender === '—' ? '??' : sender).slice(0, 2).toUpperCase();
              return (
                <Card
                  key={item.id}
                  padding="md"
                  variant="default"
                  onPress={() => onItemPress(item)}
                  onLongPress={() => onItemLongPress(item)}
                  style={{ position: 'relative' }}>
                  {/* Linker Unread-Strip */}
                  {unread ? (
                    <View
                      style={[
                        styles.unreadStrip,
                        { backgroundColor: c.warm },
                      ]}
                    />
                  ) : null}
                  <View style={styles.itemBody}>
                    <View
                      style={[
                        styles.itemAvatar,
                        {
                          backgroundColor: isBroadcast ? c.accentSoft : c.warmSoft,
                        },
                      ]}>
                      <Text
                        style={{
                          color: isBroadcast ? c.accent : c.warm,
                          fontFamily: Fonts.display.bold,
                          fontSize: 14,
                        }}>
                        {initials}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.headerRow}>
                        <Text
                          style={{
                            color: c.text,
                            fontFamily: Fonts.display.bold,
                            fontSize: 14,
                            letterSpacing: -0.2,
                          }}
                          numberOfLines={1}>
                          @{sender}
                        </Text>
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: Fonts.mono.semibold,
                            fontSize: 10,
                            letterSpacing: 0.4,
                          }}
                          numberOfLines={1}>
                          · {sourceLabel}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: Fonts.body.regular,
                          fontSize: 13,
                          lineHeight: 19,
                        }}
                        numberOfLines={3}>
                        {item.body}
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
                        {formatRelativeTime(item.created_at)}
                      </Text>
                    </View>
                  </View>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerBlock: {
    marginBottom: Spacing.lg,
  },
  emptyCard: { alignItems: 'center' },
  unreadStrip: {
    position: 'absolute',
    top: 16,
    left: -2,
    width: 4,
    height: 28,
    borderRadius: 2,
  },
  itemBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
});
