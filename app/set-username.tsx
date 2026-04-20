import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function SetUsernameScreen() {
  const { user, refreshProfile, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const clean = username.trim();
    if (!USERNAME_REGEX.test(clean)) {
      setError('3–20 Zeichen, nur Buchstaben, Zahlen, Unterstrich.');
      return;
    }
    if (!user) {
      setError('Keine Session. Bitte neu einloggen.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ username: clean, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setBusy(false);
    if (err) {
      if (err.code === '23505') {
        setError('Dieser Username ist schon vergeben.');
      } else {
        setError(err.message);
      }
      return;
    }
    await refreshProfile();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Username wählen
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          So sehen dich deine Liga-Mitspieler.
        </ThemedText>

        <TextInput
          style={styles.input}
          placeholder="z.B. bolzkoenig"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          value={username}
          onChangeText={setUsername}
          editable={!busy}
        />

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}>
          <ThemedText style={styles.primaryBtnText}>
            {busy ? 'Speichere…' : 'Weiter'}
          </ThemedText>
        </Pressable>

        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <ThemedText style={styles.signOutText}>Abmelden</ThemedText>
        </Pressable>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { textAlign: 'center', marginBottom: 4 },
  subtitle: { textAlign: 'center', marginBottom: 16, opacity: 0.7 },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#1a1a1a',
  },
  primaryBtn: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  signOutBtn: { alignItems: 'center', marginTop: 16 },
  signOutText: { color: '#888' },
  error: { color: '#ef5350' },
});
