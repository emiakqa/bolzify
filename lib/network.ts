// Bolzify — Network State Hook
//
// Globaler Online/Offline-Status für die App. Wird verwendet:
//  - vom OfflineBanner an der Root, um "Du bist offline" einzublenden
//  - von ErrorCard / Screens für differenzierte Fehler-UX
//  - vom Auth-Layer um nicht in einen Refresh-Loop zu rennen wenn das
//    Netz weg ist
//
// Wichtig: NetInfo ist nicht 100% zuverlässig (Captive Portals, fehlerhafte
// Telco-Konfig). Wir behandeln den Hook also nur als Hint, NICHT als
// "verbieten zu tippen". Das eigentliche Locking macht weiterhin der
// 15s-Timeout in lib/supabase.ts und Server-side RLS.

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

let lastState: NetInfoState | null = null;
const listeners = new Set<(connected: boolean) => void>();

// Globaler Subscribe — einmalig pro App-Lifecycle, alle Hooks nutzen den
// gleichen Stream. Spart Battery und vermeidet doppelte Banner.
NetInfo.addEventListener((state) => {
  lastState = state;
  const connected = isConsideredOnline(state);
  listeners.forEach((fn) => fn(connected));
});

// "Online" ist konservativ definiert: NetInfo muss explizit sagen, dass
// das Gerät verbunden UND erreichbar ist. Bei Unklarheit (z.B. isInternetReachable
// noch null beim App-Start) gehen wir von "online" aus, damit die App nicht
// fälschlich Offline-Banner zeigt während sie eigentlich noch testet.
function isConsideredOnline(state: NetInfoState | null): boolean {
  if (!state) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/**
 * Hook: gibt true wenn das Gerät online ist (laut NetInfo).
 * Default ist `true` — wir zeigen kein Offline-Banner solange wir es
 * nicht eindeutig wissen.
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState<boolean>(isConsideredOnline(lastState));

  useEffect(() => {
    listeners.add(setOnline);
    // Direkt einmal aktiv abfragen, damit der Hook auch beim ersten
    // Render schon den richtigen Wert hat (vor dem ersten Event).
    NetInfo.fetch()
      .then((state) => {
        lastState = state;
        setOnline(isConsideredOnline(state));
      })
      .catch(() => {
        // ignore — bleiben optimistisch online
      });
    return () => {
      listeners.delete(setOnline);
    };
  }, []);

  return online;
}

/**
 * Synchroner Check ohne Hook. Für Code-Pfade, die nicht in einer
 * Komponente laufen (z.B. lib/auth Refresh-Logic).
 * Achtung: kann beim allerersten App-Start `true` zurückgeben obwohl
 * das Gerät offline ist (NetInfo hat noch nicht gemessen).
 */
export function isOnlineNow(): boolean {
  return isConsideredOnline(lastState);
}

/**
 * Klassifiziert einen Fetch-Fehler als "vermutlich offline" oder
 * "echter Server-Fehler". Wird von ErrorCard genutzt, um die richtige
 * Botschaft zu zeigen.
 */
export function looksLikeOfflineError(err: unknown): boolean {
  if (!err) return false;
  if (!isOnlineNow()) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('fetch') ||
    lower.includes('aborted') ||
    lower.includes('failed to fetch')
  );
}
