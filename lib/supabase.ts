import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '@/types/database';

// SecureStore warnt ab 2048 Byte pro Value. Supabase-Sessions sind typisch
// 2.5–3 kB (JWT + Refresh-Token + User-Object) — deshalb chunk'en wir den
// Wert transparent auf mehrere Keys. Bleibt verschlüsselt in SecureStore,
// kein AsyncStorage-Hybrid, kein extra Crypto-Dep.
const CHUNK_SIZE = 1800; // Puffer unter 2048, da UTF-8 Multi-Byte haben kann
const CHUNK_MARKER = 'chunked:';

// Silent helpers: SecureStore kann bei korruptem Keychain-State werfen — wir
// geben dann null / swallowen. Niemals das Promise rejecten, sonst hängt der
// AuthProvider auf dem Loading-Screen.
async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore — beim nächsten Schreiben wird neu versucht
  }
}

async function chunkedGet(key: string): Promise<string | null> {
  const meta = await safeGet(key);
  if (!meta) return null;
  if (!meta.startsWith(CHUNK_MARKER)) return meta; // Legacy / kleiner Wert
  const count = parseInt(meta.slice(CHUNK_MARKER.length), 10);
  if (!Number.isFinite(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const p = await safeGet(`${key}.${i}`);
    if (p === null) return null; // korrupter State → Supabase behandelt als „keine Session"
    parts.push(p);
  }
  return parts.join('');
}

async function chunkedRemove(key: string): Promise<void> {
  const meta = await safeGet(key);
  if (meta && meta.startsWith(CHUNK_MARKER)) {
    const count = parseInt(meta.slice(CHUNK_MARKER.length), 10);
    if (Number.isFinite(count)) {
      for (let i = 0; i < count; i++) {
        await safeDelete(`${key}.${i}`);
      }
    }
  }
  await safeDelete(key);
}

async function chunkedSet(key: string, value: string): Promise<void> {
  // Immer erst sauber aufräumen, damit wir nicht Chunks von alten längeren
  // Werten liegen lassen, wenn der neue Wert kürzer ist.
  await chunkedRemove(key);
  if (value.length <= CHUNK_SIZE) {
    await safeSet(key, value);
    return;
  }
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    const part = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await safeSet(`${key}.${i}`, part);
  }
  await safeSet(key, `${CHUNK_MARKER}${count}`);
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => chunkedGet(key),
  setItem: (key: string, value: string) => chunkedSet(key, value),
  removeItem: (key: string) => chunkedRemove(key),
};

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

// Nach dem Throw-Guard sind die Werte definitiv string (nicht mehr string|undefined).
const supabaseUrl: string = rawSupabaseUrl;
const supabaseAnonKey: string = rawSupabaseAnonKey;

// Harter Netzwerk-Timeout für ALLE Supabase-Requests.
// Hintergrund: Wenn ein Token-Refresh bei schlechter Verbindung hängt,
// hält Supabase's interner Auth-Lock alle folgenden Queries fest —
// ohne Timeout bleibt die App ewig im Spinner. Mit 15s Timeout schlägt
// der Refresh sauber fehl, der Lock wird freigegeben, folgende Queries
// kommen durch (oder melden ebenfalls Fehler — aber nix hängt mehr).
const FETCH_TIMEOUT_MS = 15_000;

function timeoutFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.warn('[supabase] fetch timeout', FETCH_TIMEOUT_MS, 'ms', String(input));
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  // Caller-eigenes AbortSignal (z.B. von Query-Cancel) mit unserem mergen.
  const callerSignal = init?.signal;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(input as RequestInfo, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: timeoutFetch,
  },
});

// Notfall-Escape: wenn Supabase's Auth-Lock hängt (z.B. bei kaputter Session,
// Token-Refresh-Deadlock), können wir damit NICHT mehr via supabase.auth.signOut
// rauskommen — der nimmt denselben Lock. Stattdessen reißen wir die Session
// direkt aus SecureStore raus. User muss die App danach neu starten.
export async function clearLocalSession(): Promise<void> {
  // Supabase-default Storage-Key ist `sb-<project-ref>-auth-token`.
  // Project-Ref ist das Subdomain-Prefix der Supabase-URL.
  const projectRef = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
  const key = `sb-${projectRef}-auth-token`;
  console.log('[clearLocalSession] wiping SecureStore key', key);
  await chunkedRemove(key);
  // Safety: auch Legacy-Key (ungechunkt) wegräumen, falls vorhanden.
  await safeDelete(key);
  console.log('[clearLocalSession] done');
}
