import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('profile load error', error.message);
      setProfile(null);
    } else {
      setProfile(data ?? null);
    }
  };

  useEffect(() => {
    // WICHTIG: Wir triggern `loading=false` NICHT aus getSession(), sondern
    // aus onAuthStateChange. Grund: getSession() versucht intern einen
    // Token-Refresh, der bei schlechter/keiner Verbindung minutenlang hängen
    // kann. onAuthStateChange feuert dagegen sofort das INITIAL_SESSION-Event
    // mit dem aktuellen Session-State aus SecureStore — egal ob der Refresh
    // durchkommt oder nicht. Refresh passiert im Hintergrund.
    let mounted = true;
    const t0 = Date.now();
    console.log('[Auth] subscribing to onAuthStateChange…');

    // Damit wir das Profile nicht doppelt laden (Supabase feuert bei restored
    // sessions sowohl SIGNED_IN als auch INITIAL_SESSION mit derselben uid).
    let lastLoadedProfileForUid: string | null = null;

    // Fallback: wenn auch INITIAL_SESSION nicht innerhalb 5s kommt (z.B. weil
    // SecureStore-Read hängt), flippen wir loading trotzdem und zeigen Login.
    // Wird abgeräumt, sobald das erste Auth-Event durch ist.
    let timeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (!mounted) return;
      console.warn('[Auth] no auth event within 5s — forcing loading=false');
      setLoading(false);
    }, 5000);

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      console.log(
        '[Auth] event=',
        event,
        'hasSession=',
        !!newSession,
        'after',
        Date.now() - t0,
        'ms',
      );

      // Erstes Event ist da → Fallback-Timer kann weg.
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      setSession(newSession);
      // Loading SOFORT flippen, damit die App rendert. Auf den Profile-Load
      // warten wir hier NICHT — siehe Kommentar unten.
      setLoading(false);

      // ⚠️  Supabase-js Deadlock-Falle: Solange dieser Callback läuft, hält
      // supabase-js den internen Auth-Lock. Jede `await supabase.from(...)`
      // hier drin blockiert auf demselben Lock → Hänger beim App-Reopen mit
      // restored session (Token-Refresh läuft parallel und beißt sich mit
      // unserer Query). Mit setTimeout(0) returnt der Callback erst, der
      // Lock wird freigegeben, danach läuft die Query sauber durch.
      // Doku: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
      if (newSession?.user) {
        const uid = newSession.user.id;
        // Skip, wenn wir das Profile für genau diesen User schon geladen haben
        // — sonst doppelter Roundtrip bei SIGNED_IN + INITIAL_SESSION.
        if (lastLoadedProfileForUid === uid) return;
        lastLoadedProfileForUid = uid;
        setTimeout(() => {
          if (!mounted) return;
          loadProfile(uid)
            .then(() => console.log('[Auth] profile loaded'))
            .catch((e) => {
              console.warn('[Auth] profile load failed', e);
              // Nächster Auth-Event darf's nochmal versuchen
              if (lastLoadedProfileForUid === uid) lastLoadedProfileForUid = null;
            });
        }, 0);
      } else {
        lastLoadedProfileForUid = null;
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function isPlaceholderUsername(username: string | null | undefined): boolean {
  return !!username && username.startsWith('user_');
}
