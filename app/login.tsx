import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('E-Mail und Passwort sind Pflicht.');
      return;
    }
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
    } else if (mode === 'signup') {
      setInfo('Konto erstellt. Falls E-Mail-Bestätigung an ist, check dein Postfach.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Bolzify
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {mode === 'signin' ? 'Einloggen' : 'Konto anlegen'}
        </ThemedText>

        <TextInput
          style={styles.input}
          placeholder="E-Mail"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          placeholderTextColor="#888"
          secureTextEntry
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        {info && <ThemedText style={styles.info}>{info}</ThemedText>}

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}>
          <ThemedText style={styles.primaryBtnText}>
            {busy ? 'Einen Moment…' : mode === 'signin' ? 'Einloggen' : 'Registrieren'}
          </ThemedText>
        </Pressable>

        <View style={styles.switchRow}>
          <ThemedText>
            {mode === 'signin' ? 'Noch kein Konto?' : 'Schon ein Konto?'}
          </ThemedText>
          <Pressable
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}>
            <ThemedText style={styles.link}>
              {mode === 'signin' ? 'Registrieren' : 'Einloggen'}
            </ThemedText>
          </Pressable>
        </View>
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
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  link: { color: '#66bb6a', fontWeight: '600' },
  error: { color: '#ef5350' },
  info: { color: '#66bb6a' },
});
