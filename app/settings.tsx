import * as Application from 'expo-application';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
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
import { getUnreadCount, isAppAdmin } from '@/lib/inbox';
import {
  clearAllReminders,
  getRemindersEnabled,
  setRemindersEnabled,
  syncReminders,
} from '@/lib/notifications';
import { resetOnboarding } from '@/lib/onboarding';
import { clearLocalSession, supabase } from '@/lib/supabase';

// TODO(2026-05): Sobald GitHub Pages public live ist, sind diese URLs
// erreichbar. Bis dahin liefern sie 404 — App-Store-Submission braucht
// das aber sowieso erst zum Beta-Test-Start.
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

  // Admin-Check ein Mal pro Mount
  useEffect(() => {
    if (!user) return;
    isAppAdmin(user.id).then(setAdmin);
  }, [user]);

  // Unread bei jedem Focus neu laden (z.B. nach Rückkehr aus Inbox)
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
    // AuthGate redirectet zum Login automatisch
  };

  const versionText = `${Application.nativeApplicationVersion ?? '0.0.0'}${
    Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''
  }`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ThemedText
            style={{ color: c.textMuted, fontFamily: Fonts?.rounded, fontSize: FontSize.md }}>
            ← Zurück
          </ThemedText>
        </Pressable>

        <ThemedText style={[styles.h1, { color: c.text }]}>Einstellungen</ThemedText>

        {/* Profil-Row als Hero-Card */}
        <Card padding="md" onPress={() => router.push('/profile')} style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatarCircle,
                { borderColor: c.border, backgroundColor: c.surfaceElevated },
              ]}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <ThemedText style={{ fontSize: 22 }}>👤</ThemedText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText
                style={{
                  color: c.text,
                  fontSize: FontSize.lg,
                  lineHeight: LineHeight.lg,
                  fontFamily: Fonts?.rounded,
                  fontWeight: FontWeight.semibold,
                }}>
                @{profile?.username ?? '—'}
              </ThemedText>
              <ThemedText
                style={{
                  color: c.textMuted,
                  fontSize: FontSize.xs,
                  lineHeight: LineHeight.xs,
                  fontFamily: Fonts?.rounded,
                  marginTop: 2,
                }}>
                Profil bearbeiten
              </ThemedText>
            </View>
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.xl,
                lineHeight: LineHeight.xl,
                fontFamily: Fonts?.rounded,
              }}>
              ›
            </ThemedText>
          </View>
        </Card>

        <SectionHeader title="Postfach" marginTop={Spacing.lg} />
        <Card padding="md" onPress={() => router.push('/inbox')} style={styles.cardSpacing}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText
                style={{
                  color: c.text,
                  fontSize: FontSize.md,
                  lineHeight: LineHeight.md,
                  fontFamily: Fonts?.rounded,
                  fontWeight: FontWeight.semibold,
                }}>
                Nachrichten
              </ThemedText>
              <ThemedText
                style={{
                  color: c.textMuted,
                  fontSize: FontSize.xs,
                  lineHeight: LineHeight.xs,
                  fontFamily: Fonts?.rounded,
                  marginTop: 2,
                }}>
                Liga-Ankündigungen & News vom Bolzify-Team
              </ThemedText>
            </View>
            {unread > 0 ? <Badge label={`${unread} neu`} tone="accent" /> : null}
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.xl,
                lineHeight: LineHeight.xl,
                fontFamily: Fonts?.rounded,
              }}>
              ›
            </ThemedText>
          </View>
        </Card>
        {admin ? (
          <Card
            padding="md"
            onPress={() => router.push('/broadcast-new')}
            style={styles.cardSpacing}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={{
                    color: c.text,
                    fontSize: FontSize.md,
                    lineHeight: LineHeight.md,
                    fontFamily: Fonts?.rounded,
                    fontWeight: FontWeight.semibold,
                  }}>
                  Broadcast senden
                </ThemedText>
                <ThemedText
                  style={{
                    color: c.textMuted,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                    fontFamily: Fonts?.rounded,
                    marginTop: 2,
                  }}>
                  Nachricht an alle App-User
                </ThemedText>
              </View>
              <Badge label="Admin" tone="warn" />
              <ThemedText
                style={{
                  color: c.textFaint,
                  fontSize: FontSize.xl,
                  lineHeight: LineHeight.xl,
                  fontFamily: Fonts?.rounded,
                }}>
                ›
              </ThemedText>
            </View>
          </Card>
        ) : null}

        <SectionHeader title="Benachrichtigungen" marginTop={Spacing.lg} />
        <Card padding="md" style={styles.cardSpacing}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText
                style={{
                  color: c.text,
                  fontSize: FontSize.md,
                  lineHeight: LineHeight.md,
                  fontFamily: Fonts?.rounded,
                  fontWeight: FontWeight.semibold,
                }}>
                Tipp-Erinnerungen
              </ThemedText>
              <ThemedText
                style={{
                  color: c.textMuted,
                  fontSize: FontSize.xs,
                  lineHeight: LineHeight.xs,
                  fontFamily: Fonts?.rounded,
                  marginTop: 2,
                }}>
                1 Stunde vor Anpfiff, wenn du noch nicht getippt hast
              </ThemedText>
            </View>
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              trackColor={{ true: c.accent, false: c.border }}
              thumbColor={c.accentFg}
            />
          </View>
        </Card>

        <SectionHeader title="Account" />
        <Card padding="md" onPress={signOut} style={styles.cardSpacing}>
          <View style={styles.row}>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
                flex: 1,
              }}>
              Abmelden
            </ThemedText>
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.xs,
                lineHeight: LineHeight.xs,
                fontFamily: Fonts?.rounded,
              }}
              numberOfLines={1}>
              {user?.email ?? ''}
            </ThemedText>
          </View>
        </Card>
        <Card
          padding="md"
          onPress={confirmDelete}
          disabled={deleting}
          style={{ ...styles.cardSpacing, borderColor: c.danger }}>
          <View style={styles.row}>
            <ThemedText
              style={{
                color: c.danger,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
              }}>
              {deleting ? 'Lösche…' : 'Account löschen'}
            </ThemedText>
          </View>
        </Card>

        {__DEV__ ? (
          <>
            <SectionHeader title="Dev" />
            <Card
              padding="md"
              onPress={async () => {
                await resetOnboarding();
                router.replace('/onboarding');
              }}
              style={styles.cardSpacing}>
              <View style={styles.row}>
                <ThemedText
                  style={{
                    color: c.text,
                    fontSize: FontSize.md,
                    lineHeight: LineHeight.md,
                    fontFamily: Fonts?.rounded,
                    fontWeight: FontWeight.semibold,
                    flex: 1,
                  }}>
                  Onboarding zurücksetzen
                </ThemedText>
                <ThemedText
                  style={{
                    color: c.textFaint,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                    fontFamily: Fonts?.rounded,
                    fontWeight: FontWeight.bold,
                    letterSpacing: LetterSpacing.label,
                  }}>
                  DEV
                </ThemedText>
              </View>
            </Card>
            <Card
              padding="md"
              onPress={async () => {
                // Direkter SecureStore-Wipe, umgeht Supabase's Auth-Lock.
                // Nötig, wenn der Auth-Lock hängt und supabase.auth.signOut
                // selbst nicht mehr zurückkommt.
                await clearLocalSession();
                Alert.alert(
                  'Session gelöscht',
                  'Bitte App im Task-Switcher komplett schließen und neu öffnen, damit Supabase sauber neu initialisiert.',
                );
              }}
              style={{ ...styles.cardSpacing, borderColor: c.danger }}>
              <View style={styles.row}>
                <ThemedText
                  style={{
                    color: c.danger,
                    fontSize: FontSize.md,
                    lineHeight: LineHeight.md,
                    fontFamily: Fonts?.rounded,
                    fontWeight: FontWeight.semibold,
                    flex: 1,
                  }}>
                  Session hart leeren (SecureStore-Wipe)
                </ThemedText>
                <ThemedText
                  style={{
                    color: c.textFaint,
                    fontSize: FontSize.xs,
                    lineHeight: LineHeight.xs,
                    fontFamily: Fonts?.rounded,
                    fontWeight: FontWeight.bold,
                    letterSpacing: LetterSpacing.label,
                  }}>
                  DEV
                </ThemedText>
              </View>
            </Card>
          </>
        ) : null}

        <SectionHeader title="Info" />
        <Card
          padding="md"
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
          style={styles.cardSpacing}>
          <View style={styles.row}>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
                flex: 1,
              }}>
              Datenschutz
            </ThemedText>
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.lg,
                lineHeight: LineHeight.lg,
                fontFamily: Fonts?.rounded,
              }}>
              ↗
            </ThemedText>
          </View>
        </Card>
        <Card
          padding="md"
          onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})}
          style={styles.cardSpacing}>
          <View style={styles.row}>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
                flex: 1,
              }}>
              Support & FAQ
            </ThemedText>
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.lg,
                lineHeight: LineHeight.lg,
                fontFamily: Fonts?.rounded,
              }}>
              ↗
            </ThemedText>
          </View>
        </Card>
        <Card
          padding="md"
          onPress={() => router.push('/impressum')}
          style={styles.cardSpacing}>
          <View style={styles.row}>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
                flex: 1,
              }}>
              Impressum
            </ThemedText>
            <ThemedText
              style={{
                color: c.textFaint,
                fontSize: FontSize.xl,
                lineHeight: LineHeight.xl,
                fontFamily: Fonts?.rounded,
              }}>
              ›
            </ThemedText>
          </View>
        </Card>
        <Card padding="md" style={styles.cardSpacing}>
          <View style={styles.row}>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.md,
                lineHeight: LineHeight.md,
                fontFamily: Fonts?.rounded,
                fontWeight: FontWeight.semibold,
                flex: 1,
              }}>
              Version
            </ThemedText>
            <ThemedText
              style={{
                color: c.textMuted,
                fontSize: FontSize.sm,
                lineHeight: LineHeight.sm,
                fontFamily: Fonts?.rounded,
              }}>
              {versionText}
            </ThemedText>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.jumbo },
  back: { marginBottom: Spacing.md },
  h1: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.heavy,
    fontFamily: Fonts?.rounded,
    letterSpacing: LetterSpacing.heading,
    marginBottom: Spacing.lg,
  },
  profileCard: {
    marginBottom: Spacing.sm,
  },
  cardSpacing: {
    marginBottom: Spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
