import * as Application from 'expo-application';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Colors,
  Fonts,
  LetterSpacing,
  Spacing,
} from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { getUnreadCount, isAppAdmin } from '@/lib/inbox';
import {
  clearAllReminders,
  getRemindersEnabled,
  setRemindersEnabled,
  syncReminders,
} from '@/lib/notifications';
import { resetOnboarding } from '@/lib/onboarding';
import { clearLocalSession, supabase } from '@/lib/supabase';

const PRIVACY_URL = 'https://emiakqa.github.io/bolzify/privacy.html';
const SUPPORT_URL = 'https://emiakqa.github.io/bolzify/support.html';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [remindersOn, setRemindersOn] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    getRemindersEnabled().then(setRemindersOn);
  }, []);

  useEffect(() => {
    if (!user) return;
    isAppAdmin(user.id).then(setAdmin);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getUnreadCount(user.id).then(setUnread);
    }, [user]),
  );

  const toggleReminders = async (v: boolean) => {
    setRemindersOn(v);
    await setRemindersEnabled(v);
    if (v && user) {
      syncReminders(user.id).catch(() => {});
    } else {
      clearAllReminders().catch(() => {});
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Account wirklich löschen?',
      'Alle deine Tipps, Punkte und selbst erstellten Ligen werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: doDelete },
      ],
    );
  };

  const doDelete = async () => {
    if (!user) return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      setDeleting(false);
      Alert.alert('Fehler', error.message);
      return;
    }
    await clearAllReminders().catch(() => {});
    await signOut();
  };

  const versionText = `${Application.nativeApplicationVersion ?? '0.0.0'}${
    Application.nativeBuildVersion ? ` · BUILD ${Application.nativeBuildVersion}` : ''
  }`;

  const initials = (profile?.username ?? '??').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
              ‹ Zurück
            </Text>
          </Pressable>
          <Text style={{ color: c.text, fontFamily: Fonts.display.bold, fontSize: 17 }}>
            Einstellungen
          </Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Profil-Hero */}
        <Card variant="elevated" padding="lg" onPress={() => router.push('/profile')}>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: profile?.avatar_url ? c.surface : c.warmSoft },
              ]}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Text style={{ color: c.warm, fontFamily: Fonts.display.bold, fontSize: 24 }}>
                  {initials}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: Fonts.display.bold,
                  fontSize: 19,
                  letterSpacing: -0.4,
                }}>
                @{profile?.username ?? '—'}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: Fonts.body.regular,
                  fontSize: 13,
                  marginTop: 2,
                }}
                numberOfLines={1}>
                {user?.email ?? ''}
              </Text>
              {unread > 0 ? (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  <Badge label={`${unread} NEU`} tone="warm" />
                </View>
              ) : null}
            </View>
            <Text style={{ color: c.textFaint, fontSize: 22 }}>›</Text>
          </View>
        </Card>

        <Group label="Postfach" c={c}>
          <Row
            icon="✉"
            label="Nachrichten"
            value={unread > 0 ? `${unread} neu` : undefined}
            onPress={() => router.push('/inbox')}
            c={c}
            last={!admin}
          />
          {admin ? (
            <Row
              icon="✎"
              label="Broadcast senden"
              value="Admin"
              onPress={() => router.push('/broadcast-new')}
              c={c}
              last
            />
          ) : null}
        </Group>

        <Group label="Benachrichtigungen" c={c}>
          <Row
            icon="🔔"
            label="Tipp-Erinnerungen"
            toggle={remindersOn ? 'on' : 'off'}
            onToggle={toggleReminders}
            c={c}
            last
          />
        </Group>

        <Group label="Account" c={c}>
          <Row icon="↪" label="Abmelden" onPress={signOut} c={c} last />
        </Group>

        <Group label="Über" c={c}>
          <Row
            icon="§"
            label="Datenschutz"
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
            c={c}
          />
          <Row
            icon="?"
            label="Support & FAQ"
            onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})}
            c={c}
          />
          <Row icon="◯" label="Impressum" onPress={() => router.push('/impressum')} c={c} last />
        </Group>

        <Group label="Konto" c={c}>
          <Row
            icon="⚠"
            label={deleting ? 'Lösche…' : 'Account löschen'}
            onPress={confirmDelete}
            c={c}
            danger
            last
          />
        </Group>

        {__DEV__ ? (
          <Group label="Dev" c={c}>
            <Row
              icon="↺"
              label="Onboarding zurücksetzen"
              onPress={async () => {
                await resetOnboarding();
                router.replace('/onboarding');
              }}
              c={c}
              value="DEV"
            />
            <Row
              icon="⚠"
              label="Session hart leeren"
              onPress={async () => {
                await clearLocalSession();
                Alert.alert(
                  'Session gelöscht',
                  'Bitte App im Task-Switcher schließen und neu öffnen.',
                );
              }}
              c={c}
              value="DEV"
              last
            />
          </Group>
        ) : null}

        <Text
          style={{
            color: c.textFaint,
            fontFamily: Fonts.mono.regular,
            fontSize: 10,
            letterSpacing: 0.6,
            textAlign: 'center',
            marginTop: Spacing.md,
            textTransform: 'uppercase',
          }}>
          Bolzify v{versionText}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({
  label,
  c,
  children,
}: {
  label: string;
  c: (typeof Colors)['light'];
  children: ReactNode;
}) {
  return (
    <View style={{ marginTop: Spacing.lg }}>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: Fonts.mono.bold,
          fontSize: 10,
          letterSpacing: LetterSpacing.label,
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingLeft: 4,
        }}>
        {label}
      </Text>
      <Card variant="flat" padding={0} style={{ overflow: 'hidden' }}>
        {children}
      </Card>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  toggle,
  onToggle,
  last,
  danger,
  c,
}: {
  icon?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: 'on' | 'off';
  onToggle?: (v: boolean) => void;
  last?: boolean;
  danger?: boolean;
  c: (typeof Colors)['light'];
}) {
  const content = (
    <View
      style={[
        styles.row,
        { borderBottomColor: c.divider, borderBottomWidth: last ? 0 : 1 },
      ]}>
      {icon ? (
        <View
          style={[
            styles.rowIcon,
            { backgroundColor: danger ? c.dangerSoft : c.accentSoft },
          ]}>
          <Text style={{ color: danger ? c.danger : c.accent, fontSize: 14 }}>{icon}</Text>
        </View>
      ) : null}
      <Text
        style={{
          flex: 1,
          color: danger ? c.danger : c.text,
          fontFamily: Fonts.body.medium,
          fontSize: 14,
        }}>
        {label}
      </Text>
      {toggle ? (
        <Switch
          value={toggle === 'on'}
          onValueChange={onToggle}
          trackColor={{ true: c.accent, false: c.borderStrong }}
          thumbColor="#FFFFFF"
        />
      ) : value ? (
        <Text
          style={{
            color: c.textMuted,
            fontFamily: Fonts.mono.semibold,
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          {value}
        </Text>
      ) : !danger && onPress ? (
        <Text style={{ color: c.textFaint, fontSize: 16 }}>›</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
