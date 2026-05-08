// Bolzify — Aktive Liga (AsyncStorage-Pointer).
//
// Seit per-Liga-Tipps (0016): jeder Tipp gehört zu genau einer Liga. Damit
// wir auf Home/My-Tips/Sondertipps nicht 3-mal nachfragen müssen, persistieren
// wir die "aktuell ausgewählte" Liga pro Device.
//
// Pub/Sub-Pattern wie in onboarding.ts — wenn der User im League-Picker die
// Liga wechselt, kriegen alle subscribenden Screens den neuen Wert sofort
// mit, ohne Page-Reload.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bolzify.activeLeagueId.v1';

type Listener = (leagueId: string | null) => void;
const listeners = new Set<Listener>();

export function subscribeActiveLeague(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(leagueId: string | null): void {
  listeners.forEach((l) => {
    try {
      l(leagueId);
    } catch {
      // Listener-Fehler sollen uns nicht den Picker blockieren.
    }
  });
}

export async function getActiveLeagueId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setActiveLeagueId(leagueId: string | null): Promise<void> {
  if (leagueId === null) {
    await AsyncStorage.removeItem(KEY);
  } else {
    await AsyncStorage.setItem(KEY, leagueId);
  }
  emit(leagueId);
}

/**
 * Liefert die aktive Liga, validiert gegen die übergebenen verfügbaren IDs.
 * Wenn die gespeicherte ID nicht (mehr) in der Liste ist (User hat die Liga
 * verlassen / sie wurde gelöscht), fällt der Helper auf die erste verfügbare
 * Liga zurück und persistiert diese als neuen Default.
 *
 * Liefert `null` wenn die Liste leer ist (User in keiner Liga) — Aufrufer
 * müssen dann den "Liga beitreten/erstellen"-Empty-State zeigen.
 */
export async function pickActiveLeagueId(
  availableIds: string[],
): Promise<string | null> {
  if (availableIds.length === 0) {
    // User in keiner Liga mehr — alten Pointer wegräumen, sonst kommt er
    // beim nächsten Beitritt mit einer toten ID zurück.
    await setActiveLeagueId(null);
    return null;
  }
  const stored = await getActiveLeagueId();
  if (stored && availableIds.includes(stored)) {
    return stored;
  }
  // Fallback: erste verfügbare Liga (Reihenfolge entscheidet der Aufrufer —
  // typisch sortiert nach created_at desc, also „neueste zuerst").
  const next = availableIds[0];
  await setActiveLeagueId(next);
  return next;
}
