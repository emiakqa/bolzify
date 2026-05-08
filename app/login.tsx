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

type Mode = 'signin' | 'signup';

// Pragmatischer E-Mail-Format-Check: mind. 1 nicht-Whitespace + @ + 1
// nicht-Whitespace + . + 1 nicht-Whitespace. Fängt Tippfehler („foo@bar"),
// fehlende Domain, fehlendes @ usw. Vollständige RFC-5322-Validierung wäre
// Overkill und liefert keine besseren Ergebnisse — der Confirm-Mail-Flow
// auf Supabase-Seite ist die echte Bestätigung.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Wenn Sign-In an „Email not confirmed" scheitert, blenden wir einen
  // „Bestätigungs-Mail erneut senden"-Button ein.
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  const isSignup = mode === 'signup';

  const switchMode = () => {
    setMode(isSignup ? 'signin' : 'signup');
    setError(null);
    setInfo(null);
    setNeedsConfirmation(false);
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    setNeedsConfirmation(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('E-Mail und Passwort sind Pflicht.');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Bitte gültige E-Mail-Adresse eingeben.');
      return;
    }
    if (password.length < (isSignup ? 8 : 6)) {
      setError(
        isSignup
          ? 'Passwort muss mindestens 8 Zeichen haben.'
          : 'Passwort muss mindestens 6 Zeichen haben.',
      );
      return;
    }

    if (isSignup && !acceptTerms) {
      setError('Bitte AGB und Datenschutz akzeptieren.');
      return;
    }

    setBusy(true);
    const fn = isSignup ? signUp : signIn;
    const { error: err } = await fn(trimmedEmail, password);

    if (err) {
      setBusy(false);
      // Supabase liefert für unbestätigte Mails „Email not confirmed". Wenn das
      // hier landet, hat der User schon einen Account, hat aber noch nicht auf
      // den Bestätigungslink geklickt. Resend-Button anbieten.
      const lower = err.toLowerCase();
      if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
        setNeedsConfirmation(true);
        setError('E-Mail noch nicht bestätigt. Schau im Postfach (auch Spam).');
      } else {
        setError(err);
      }
      return;
    }

    // Sign-Up bei aktiviertem Confirm-Mail-Flow auf Supabase: signUp gibt
    // KEIN error zurück, aber session bleibt null bis User auf den Link
    // klickt. Wir kommunizieren das hier proaktiv, sonst denkt der User der
    // Login hängt.
    if (isSignup) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setBusy(false);
        setInfo(
          `Wir haben dir eine Bestätigungs-Mail an ${trimmedEmail} geschickt. Bitte den Link klicken, dann hier einloggen.`,
        );
        setMode('signin');
        return;
      }
    }

    // Bei Signup ohne Confirm-Mail: Username wird auf /set-username gesetzt
    // (AuthGate routet automatisch hin). Hier kein Profile-Update mehr.
    setBusy(false);
  };

  const resendConfirmation = async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Bitte gültige E-Mail-Adresse eingeben.');
      return;
    }
    setResending(true);
    setError(null);
    setInfo(null);
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: trimmedEmail,
    });
    setResending(false);
    if (err) {
      setError(err.message);
    } else {
      setInfo(`Neue Bestätigungs-Mail an ${trimmedEmail} geschickt.`);
      setNeedsConfirmation(false);
    }
  };

  const ctaLabel = isSignup ? 'Registrieren' : 'Einloggen';
  const ctaDisabled = busy || (isSignup && !acceptTerms);

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
            {isSignup ? 'Neu hier' : 'Anpfiff in Kürze'}
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
              {isSignup ? 'Konto anlegen.' : 'Willkommen zurück.'}
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
              {isSignup
                ? 'Mail + Passwort — Username wählst du gleich.'
                : 'Tipp deine Spiele und sieh, wer in deiner Liga vorne liegt.'}
            </Text>
          </View>

          {/* Felder */}
          <View style={{ gap: 14 }}>
            <Field
              c={c}
              label="E-Mail"
              placeholder="anna.b@bolzify.de"
              icon="✉"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!busy}
              returnKeyType="next"
              testID="login-email-input"
            />

            <Field
              c={c}
              label="Passwort"
              placeholder={isSignup ? 'min. 8 Zeichen' : '••••••••'}
              icon="🔒"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={submit}
              testID="login-password-input"
            />

            {isSignup ? (
              <TermsCheckbox
                c={c}
                checked={acceptTerms}
                onToggle={() => setAcceptTerms((v) => !v)}
                testID="login-terms-checkbox"
              />
            ) : (
              <Pressable
                onPress={() => {
                  // Forgot-Password-Flow ist noch nicht implementiert.
                  setInfo('Passwort-Reset folgt — bitte Support anschreiben.');
                }}
                hitSlop={8}
                testID="login-forgot-password">
                <Text
                  style={{
                    textAlign: 'right',
                    color: c.textMuted,
                    fontFamily: Fonts.body.medium,
                    fontSize: 13,
                  }}>
                  Passwort vergessen?
                </Text>
              </Pressable>
            )}
          </View>

          {/* Error / Info */}
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
          {info ? (
            <Text
              style={{
                color: c.success,
                fontFamily: Fonts.body.medium,
                fontSize: 13,
                textAlign: 'center',
                marginTop: 12,
              }}>
              {info}
            </Text>
          ) : null}

          {/* Resend-Button: nur sichtbar wenn Sign-In an unbestätigter Mail
              gescheitert ist. */}
          {needsConfirmation ? (
            <Pressable
              onPress={resendConfirmation}
              hitSlop={8}
              disabled={resending}
              testID="login-resend-confirmation"
              style={({ pressed }) => ({
                opacity: pressed || resending ? 0.6 : 1,
                marginTop: 8,
              })}>
              <Text
                style={{
                  color: c.accent,
                  fontFamily: Fonts.body.bold,
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                {resending ? 'Sende…' : 'Bestätigungs-Mail erneut senden ›'}
              </Text>
            </Pressable>
          ) : null}

          {/* CTA */}
          <View style={{ marginTop: 18 }}>
            <Button
              label={ctaLabel}
              onPress={submit}
              loading={busy}
              disabled={ctaDisabled}
              size="lg"
              fullWidth
              variant="primary"
              testID="login-submit-button"
            />
          </View>

          {/* Switch-Link */}
          <View style={styles.switchRow}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: Fonts.body.regular,
                fontSize: 14,
              }}>
              {isSignup ? 'Schon ein Konto?' : 'Noch kein Konto?'}
            </Text>
            <Pressable onPress={switchMode} hitSlop={8} testID="login-switch-mode">
              <Text
                style={{
                  color: c.accent,
                  fontFamily: Fonts.body.bold,
                  fontSize: 14,
                }}>
                {isSignup ? 'Einloggen ›' : 'Jetzt registrieren ›'}
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
            {isSignup ? 'Keine Werbung · Kein Echtgeld · Nur Ehre' : 'Bolzify v0.17 · Made für den Bolzplatz'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandMark — Pure Wortmarke "Bolzify" + Untermarke.
// Bewusst minimalistisch (kein Disc, kein Logo-Mark) — typografisches Brand.
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
// Field — Pill-Input 56px mit Caps-Mono-Label und optionalem Icon
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
              padding: 0, // Android default-padding killen, sonst springt's
            },
            style,
          ]}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TermsCheckbox — 20×20 Square-Checkbox + AGB-Text
// ─────────────────────────────────────────────────────────────────────────────

function TermsCheckbox({
  c,
  checked,
  onToggle,
  testID,
}: {
  c: (typeof Colors)['light'];
  checked: boolean;
  onToggle: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [
        styles.termsRow,
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? c.accent : 'transparent',
            borderColor: checked ? c.accent : c.borderStrong,
          },
        ]}>
        {checked ? (
          <Text
            style={{
              color: c.accentFg,
              fontFamily: Fonts.display.heavy,
              fontSize: 12,
              lineHeight: 14,
            }}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          flex: 1,
          color: c.textMuted,
          fontFamily: Fonts.body.regular,
          fontSize: 12,
          lineHeight: 18,
        }}>
        Ich akzeptiere die{' '}
        <Text style={{ color: c.text, fontFamily: Fonts.body.semibold }}>AGB</Text> und{' '}
        <Text style={{ color: c.text, fontFamily: Fonts.body.semibold }}>Datenschutzerklärung</Text>
        .
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24, // SafeAreaView fügt Status-Bar-Inset hinzu
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
    borderRadius: Radius.md, // 14 — etwas weicher als 16, harmoniert mit unserem System
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    paddingLeft: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
});
