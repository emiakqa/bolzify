import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { pickAndUploadAvatar } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [username, setUsername] = useState(profile?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const uploadAvatar = async () => {
    if (!user) return;
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(user.id);
      if (url) await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setError(null);
    setSaved(false);
    const trimmed = username.trim();
    if (!USERNAME_RE.test(trimmed)) {
      setError('Username: 3–20 Zeichen, nur Buchstaben / Zahlen / Unterstrich');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ username: trimmed, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    if (err) {
      // Supabase unique-violation = 23505
      if (err.code === '23505' || /duplicate|unique/i.test(err.message)) {
        setError('Username bereits vergeben.');
      } else {
        setError(err.message);
      }
      return;
    }
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const dirty = username.trim() !== (profile?.username ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <ThemedText style={{ color: c.textMuted }}>← Zurück</ThemedText>
          </Pressable>

          <ThemedText style={[styles.h1, { color: c.text }]}>Profil</ThemedText>

          <View style={styles.avatarBlock}>
            <Pressable
              onPress={uploadAvatar}
              disabled={uploading}
              style={({ pressed }) => [
                styles.avatarWrap,
                {
                  borderColor: c.border,
                  backgroundColor: c.surface,
                  opacity: pressed || uploading ? 0.7 : 1,
                },
              ]}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImg}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <ThemedText style={{ fontSize: 48 }}>👤</ThemedText>
              )}
            </Pressable>
            <ThemedText
              style={{
                color: c.accent,
                fontSize: FontSize.sm,
                fontWeight: FontWeight.semibold,
              }}>
              {uploading ? 'Lade hoch…' : profile?.avatar_url ? 'Foto ändern' : 'Foto hinzufügen'}
            </ThemedText>
          </View>

          <ThemedText style={[styles.label, { color: c.textFaint }]}>Username</ThemedText>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            placeholder="dein_name"
            placeholderTextColor={c.textFaint}
            style={[
              styles.input,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
          />

          <ThemedText style={[styles.label, { color: c.textFaint }]}>E-Mail</ThemedText>
          <View style={[styles.readonly, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.md }}>
              {user?.email ?? '—'}
            </ThemedText>
          </View>

          {error ? (
            <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText>
          ) : null}

          <Pressable
            onPress={save}
            disabled={saving || !dirty}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: saved ? c.success : dirty ? c.accent : c.surfaceElevated,
                opacity: pressed || saving ? 0.7 : 1,
              },
            ]}>
            <ThemedText
              style={{
                color: dirty || saved ? c.accentFg : c.textFaint,
                fontSize: FontSize.md,
                fontWeight: FontWeight.semibold,
              }}>
              {saved ? '✓ Gespeichert' : saving ? 'Speichere…' : 'Speichern'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  back: { marginBottom: Spacing.md },
  h1: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  avatarBlock: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  label: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  readonly: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  error: { fontSize: FontSize.sm, marginTop: Spacing.md },
  cta: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
