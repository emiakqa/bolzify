import * as Application from 'expo-application';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO(2026-05): Sobald GitHub Pages public live ist, sind diese URLs
// erreichbar. Bis dahin liefern sie 404 — App-Store-Submission braucht
// das aber sowieso erst zum Beta-Test-Start.
const PRIVACY_URL = 'https://emiakqa.github.io/bolzify/privacy.html';
const SUPPORT_URL = 'https://emiakqa.github.io/bolzify/support.html';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import {
  clearAllReminders,
  getRemindersEnabled,
  setRemindersEnabled,
  syncReminders,
} from '@/lib/notifications';
import { resetOnboarding } from '@/lib/onboarding';
import { clearLocalSession, supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [remindersOn, setRemindersOn] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getRemindersEnabled().then(setRemindersOn);
  }, []);

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ThemedText style={{ color: c.textMuted }}>← Zurück</ThemedText>
        </Pressable>

        <ThemedText style={[styles.h1, { color: c.text }]}>Einstellungen</ThemedText>

        {/* Profil-Row */}
        <Pressable
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [
            styles.profileRow,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
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
                fontWeight: FontWeight.semibold,
              }}>
              @{profile?.username ?? '—'}
            </ThemedText>
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
              Profil bearbeiten
            </ThemedText>
          </View>
          <ThemedText style={{ color: c.textFaint, fontSize: FontSize.lg }}>›</ThemedText>
        </Pressable>

        <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>
          Benachrichtigungen
        </ThemedText>
        <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <ThemedText
              style={{
                color: c.text,
                fontSize: FontSize.md,
                fontWeight: FontWeight.medium,
              }}>
              Tipp-Erinnerungen
            </ThemedText>
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
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

        <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>Account</ThemedText>
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.md,
              fontWeight: FontWeight.medium,
              flex: 1,
            }}>
            Abmelden
          </ThemedText>
          <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>
            {user?.email ?? ''}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: c.surface,
              borderColor: c.danger,
              opacity: pressed || deleting ? 0.7 : 1,
            },
          ]}>
          <ThemedText
            style={{
              color: c.danger,
              fontSize: FontSize.md,
              fontWeight: FontWeight.medium,
            }}>
            {deleting ? 'Lösche…' : 'Account löschen'}
          </ThemedText>
        </Pressable>

        {__DEV__ ? (
          <>
            <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>Dev</ThemedText>
            <Pressable
              onPress={async () => {
                await resetOnboarding();
                router.replace('/onboarding');
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText
                style={{
                  color: c.text,
                  fontSize: FontSize.md,
                  fontWeight: FontWeight.medium,
                  flex: 1,
                }}>
                Onboarding zurücksetzen
              </ThemedText>
              <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>DEV</ThemedText>
            </Pressable>
            <Pressable
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
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: c.surface,
                  borderColor: c.danger,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText
                style={{
                  color: c.danger,
                  fontSize: FontSize.md,
                  fontWeight: FontWeight.medium,
                  flex: 1,
                }}>
                Session hart leeren (SecureStore-Wipe)
              </ThemedText>
              <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>DEV</ThemedText>
            </Pressable>
          </>
        ) : null}

        <ThemedText style={[styles.sectionLabel, { color: c.textFaint }]}>Info</ThemedText>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.md,
              fontWeight: FontWeight.medium,
              flex: 1,
            }}>
            Datenschutz
          </ThemedText>
          <ThemedText style={{ color: c.textFaint, fontSize: FontSize.lg }}>↗</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.md,
              fontWeight: FontWeight.medium,
              flex: 1,
            }}>
            Support & FAQ
          </ThemedText>
          <ThemedText style={{ color: c.textFaint, fontSize: FontSize.lg }}>↗</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/impressum')}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.md,
              fontWeight: FontWeight.medium,
              flex: 1,
            }}>
            Impressum
          </ThemedText>
          <ThemedText style={{ color: c.textFaint, fontSize: FontSize.lg }}>›</ThemedText>
        </Pressable>
        <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemedText
            style={{
              color: c.text,
              fontSize: FontSize.md,
              fontWeight: FontWeight.medium,
              flex: 1,
            }}>
            Version
          </ThemedText>
          <ThemedText style={{ color: c.textMuted, fontSize: FontSize.sm }}>
            {versionText}
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  back: { marginBottom: Spacing.md },
  h1: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
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
  sectionLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
