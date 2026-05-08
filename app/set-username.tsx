import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import {
  Colors,
  FontSize,
  Fonts,
  LetterSpacing,
  Radius,
  Shadow,
  Spacing,
} from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { checkUsername } from '@/lib/username-filter';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function SetUsernameScreen() {
  const { user, refreshProfile, signOut } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const clean = username.trim().replace(/^@/, '');
    if (!USERNAME_REGEX.test(clean)) {
      setError('3–20 Zeichen, nur Buchstaben, Zahlen, Unterstrich.');
      return;
    }
    const filterError = checkUsername(clean);
    if (filterError) {
      setError(filterError);
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
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Top-Kicker */}
          <Text
            style={{
              color: c.textFaint,
              fontFamily: Fonts.mono.bold,
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
            Letzter Schritt
          </Text>

          {/* Brand-Mark */}
          <View style={{ marginTop: 36, marginBottom: 28 }}>
            <BrandMark c={c} />
          </View>

          {/* Headline */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text
              style={{
                color: c.text,
                fontFamily: Fonts.display.heavy,
                fontSize: 28,
                lineHeight: 32,
                letterSpacing: -0.8,
                textAlign: 'center',
              }}>
              Wähl deinen Username.
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 14,
                lineHeight: 21,
                marginTop: 6,
                maxWidth: 280,
                textAlign: 'center',
              }}>
              So findet dich deine Liga und so erscheinst du in der Tabelle.
            </Text>
          </View>

          {/* Feld */}
          <View style={{ gap: 14 }}>
            <Field
              c={c}
              label="Username"
              placeholder="@anna_b"
              icon="@"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              maxLength={21}
              returnKeyType="done"
              onSubmitEditing={submit}
              testID="set-username-input"
            />
          </View>

          {/* Error */}
          {error ? (
            <Text
              style={{
                color: c.danger,
                fontFamily: Fonts.body.medium,
                fontSize: 13,
                textAlign: 'center',
                marginTop: 12,
              }}>
              {error}
            </Text>
          ) : null}

          {/* CTA */}
          <View style={{ marginTop: 18 }}>
            <Button
              label="Weiter"
              onPress={submit}
              loading={busy}
              disabled={busy}
              size="lg"
              fullWidth
              variant="primary"
              testID="set-username-submit"
            />
          </View>

          {/* Sign-Out-Link */}
          <View style={styles.signOutRow}>
            <Pressable onPress={signOut} hitSlop={8} testID="set-username-signout">
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: Fonts.body.medium,
                  fontSize: 13,
                }}>
                Abmelden
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={{ flex: 1, minHeight: Spacing.xxxl }} />
          <Text
            style={{
              color: c.textFaint,
              fontFamily: Fonts.mono.semibold,
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
            Bolzify · Tipprunde · Saison 26
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandMark — gleiche Wortmarke wie auf Login, sorgt für Continuity zwischen
// den beiden Onboarding-Screens.
// ─────────────────────────────────────────────────────────────────────────────

function BrandMark({ c }: { c: (typeof Colors)['light'] }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          color: c.text,
          fontFamily: Fonts.display.heavy,
          fontSize: 44,
          letterSpacing: -1.6,
          lineHeight: 46,
        }}>
        Bolzify
      </Text>
      <View style={styles.subMark}>
        <View style={[styles.subMarkLine, { backgroundColor: c.borderStrong }]} />
        <Text
          style={{
            color: c.textMuted,
            fontFamily: Fonts.mono.bold,
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}>
          Tipprunde · Saison 26
        </Text>
        <View style={[styles.subMarkLine, { backgroundColor: c.borderStrong }]} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field — Pill-Input 56px (gleich wie Login).
// ─────────────────────────────────────────────────────────────────────────────

type FieldProps = React.ComponentProps<typeof TextInput> & {
  c: (typeof Colors)['light'];
  label: string;
  icon?: string;
};

function Field({ c, label, icon, style, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: Fonts.mono.bold,
          fontSize: 10,
          letterSpacing: LetterSpacing.label,
          textTransform: 'uppercase',
          paddingLeft: 4,
        }}>
        {label}
      </Text>
      <View
        style={[
          styles.fieldBox,
          {
            backgroundColor: c.surface,
            borderColor: focused ? c.accent : c.border,
          },
          Shadow.sm,
        ]}>
        {icon ? (
          <Text
            style={{
              color: c.textMuted,
              fontFamily: Fonts.body.medium,
              fontSize: 16,
              width: 18,
              textAlign: 'center',
            }}>
            {icon}
          </Text>
        ) : null}
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={c.textFaint}
          style={[
            {
              flex: 1,
              fontFamily: Fonts.body.medium,
              fontSize: FontSize.md,
              color: c.text,
              letterSpacing: -0.1,
              padding: 0, // Android default-padding killen
            },
            style,
          ]}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  subMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  subMarkLine: {
    width: 18,
    height: 1,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  signOutRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
});
