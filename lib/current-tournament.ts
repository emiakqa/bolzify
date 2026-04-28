// Resolvt dynamisch das "aktive" Turnier aus der DB.
//
// Warum nicht hardcoded 'WM2026'?
//   - Nach WM2026 ist vor EM2028 — sobald neue Fixtures importiert werden,
//     soll die App ohne Code-Änderung umschalten.
//
// Reihenfolge:
//   1) Turnier des NÄCHSTEN geplanten Matches (laufend/bevorstehend)
//   2) Turnier des ZULETZT beendeten Matches (zwischen Turnieren)
//   3) Turnier des allerersten Matches in der DB
//   4) 'WM2026' als Hard-Fallback (leere DB)
//
// Ergebnis wird 60s gecached — reicht für UI-Nutzung, verhindert Queries
// bei jedem Screen-Mount.

import { supabase } from './supabase';

const TTL_MS = 60_000;
const DEFAULT = 'WM2026';

let cached: { value: string; expires: number } | null = null;
let inflight: Promise<string> | null = null;

export async function getCurrentTournament(): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.value;
  if (inflight) return inflight;

  inflight = (async () => {
    let value: string | null = null;

    const { data: next } = await supabase
      .from('matches')
      .select('tournament')
      .eq('status', 'scheduled')
      .order('kickoff_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    value = next?.tournament ?? null;

    if (!value) {
      const { data: last } = await supabase
        .from('matches')
        .select('tournament')
        .eq('status', 'finished')
        .order('kickoff_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      value = last?.tournament ?? null;
    }

    if (!value) {
      const { data: anyMatch } = await supabase
        .from('matches')
        .select('tournament')
        .order('kickoff_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      value = anyMatch?.tournament ?? null;
    }

    if (!value) value = DEFAULT;

    cached = { value, expires: Date.now() + TTL_MS };
    inflight = null;
    return value;
  })();

  return inflight;
}

// Für Dev-Tools / Tests: Cache leeren, damit der nächste Call neu resolvt.
export function clearCurrentTournamentCache(): void {
  cached = null;
}
