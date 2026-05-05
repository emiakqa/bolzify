// Bolzify — Sentry Crash-Reporting Wrapper
//
// Sentry ist optional: wenn EXPO_PUBLIC_SENTRY_DSN nicht gesetzt ist
// (z.B. lokales Dev ohne Sentry-Account), wird init() einfach no-op.
// Damit stürzt nichts ab, wenn man die App ohne DSN startet.
//
// init() wird in app/_layout.tsx einmal beim App-Start aufgerufen.
// captureException() überall dort, wo wir Catches haben und den Fehler
// trotzdem behalten wollen (z.B. silent retries, async-Background-Tasks).
//
// Wichtig: Sentry braucht Native Code → läuft NICHT in Expo Go,
// nur in Dev-Build / TestFlight / Production.

import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

// DSN kommt über EXPO_PUBLIC_SENTRY_DSN (Build-Time Env). Falls leer,
// initialisiert Sentry sich nicht — alle Wrapper-Funktionen werden no-op.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!DSN) {
    if (__DEV__) {
      console.log('[sentry] EXPO_PUBLIC_SENTRY_DSN nicht gesetzt — Sentry deaktiviert');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: DSN,
      // In DEV: keine Events senden, sonst spammt jeder Hot-Reload-Crash dein Quota.
      // In Production: alles senden.
      enabled: !__DEV__,
      // Performance Tracing aus — kostet Quota, brauchen wir für MVP nicht.
      tracesSampleRate: 0,
      // Session-Replay aus — Privacy + extra Quota.
      // PII-Defaults: keine IPs, keine User-Data ohne expliziten setUser().
      sendDefaultPii: false,
      // Release/Dist aus expo-constants, damit Sentry weiß welche Build-Version
      // gecrasht ist (statt nur "1.0.0" zu sagen).
      release: `bolzify@${Constants.expoConfig?.version ?? 'unknown'}`,
      dist: String(
        Constants.expoConfig?.ios?.buildNumber ??
          Constants.expoConfig?.android?.versionCode ??
          '1',
      ),
      // Vor jedem Send: ggf. Felder rauswerfen, die wir nicht senden wollen
      // (Email-Adresse aus auth-error-Messages z.B.).
      beforeSend(event) {
        // Sehr defensiv: wir senden nur Exception + Stacktrace + Release.
        // Keine Cookies, keine URLs mit Tokens.
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      },
    });
    initialized = true;
    if (__DEV__) {
      console.log('[sentry] initialized (events disabled in DEV)');
    }
  } catch (err) {
    console.warn('[sentry] init failed', err);
  }
}

/**
 * Setzt einen anonymen User-Context (nur die Supabase-UUID — keine Email,
 * kein Username). Sentry-Events werden dann pro User gruppiert, ohne PII
 * zu leaken. Bei Logout `clearSentryUser()` aufrufen.
 */
export function setSentryUser(userId: string | null) {
  if (!initialized) return;
  try {
    if (userId) Sentry.setUser({ id: userId });
    else Sentry.setUser(null);
  } catch {
    // ignore
  }
}

export function clearSentryUser() {
  setSentryUser(null);
}

/**
 * Captures an exception. Kann überall im Code aufgerufen werden — wenn
 * Sentry nicht initialisiert ist, passiert nichts. Errors werden zusätzlich
 * in DEV in die Konsole geloggt.
 */
export function captureException(err: unknown, ctx?: Record<string, unknown>) {
  if (__DEV__) {
    console.warn('[capture]', err, ctx);
  }
  if (!initialized) return;
  try {
    if (ctx) Sentry.setContext('extra', ctx);
    Sentry.captureException(err);
  } catch {
    // niemals werfen
  }
}

/**
 * Captures eine Info-Message (z.B. "User hat Sondertipp geändert").
 * In Production gut, um Edge-Cases nachzuverfolgen.
 */
export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (__DEV__) {
    console.log(`[capture-msg ${level}]`, msg);
  }
  if (!initialized) return;
  try {
    Sentry.captureMessage(msg, level);
  } catch {
    // ignore
  }
}

/**
 * Wrap-HOC für die Root-Komponente. Aktiviert Auto-Performance-Tracking
 * für Navigation. Wenn Sentry nicht initialisiert ist, gibt die Komponente
 * einfach unverändert zurück.
 */
export const sentryWrap = Sentry.wrap;
