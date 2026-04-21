// Bolzify — Scoring-Backfill.
//
// Zweck: Für alle bereits finishten Matches die Scoring-Function aufrufen.
// Nötig, weil der Trigger nur bei UPDATE feuert — Matches, die beim Import
// schon als 'finished' reinkamen (WM 2022 Dev-Daten), wurden übersprungen.
//
// Idempotent: score_match überschreibt per UPSERT, kein Risk bei Re-Run.
//
// Usage: node scripts/score-backfill.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const envText = readFileSync(envPath, 'utf-8');
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  if (!(key in process.env)) process.env[key] = val;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) throw new Error('EXPO_PUBLIC_SUPABASE_URL fehlt');
if (!SUPABASE_SERVICE_ROLE) throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Finished Matches mit Ergebnis holen
const { data: matches, error } = await supabase
  .from('matches')
  .select('id, home_team, away_team, home_goals, away_goals, status')
  .eq('status', 'finished')
  .not('home_goals', 'is', null)
  .not('away_goals', 'is', null);

if (error) throw new Error(`matches select: ${error.message}`);

if (!matches || matches.length === 0) {
  console.log('→ Keine finishten Matches mit Ergebnis in DB.');
  process.exit(0);
}

console.log(`→ ${matches.length} finished matches gefunden, score them`);

let totalScored = 0;
let totalTips = 0;

for (const m of matches) {
  const { data: scored, error: scoreErr } = await supabase.rpc('score_match', {
    p_match_id: m.id,
  });
  if (scoreErr) {
    console.warn(`  ✗ ${m.home_team} vs ${m.away_team} (${m.id}): ${scoreErr.message}`);
    continue;
  }
  const n = scored ?? 0;
  if (n > 0) {
    console.log(`  ✓ ${m.home_team} ${m.home_goals}-${m.away_goals} ${m.away_team}: ${n} Tipp(s) gescored`);
    totalScored++;
    totalTips += n;
  }
}

// Summary
const { count } = await supabase.from('scored_tips').select('*', { count: 'exact', head: true });
console.log(`\n✓ done — ${totalScored} matches mit Tipps, ${totalTips} Tipp(s) gescored`);
console.log(`  scored_tips Tabelle enthält jetzt ${count} Einträge`);
