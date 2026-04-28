// Bolzify — Tor-Statistik aller Spieler eines Turniers aus api-football importieren.
//
// Endpoint: GET /players/topscorers?league=1&season=YYYY
// Liefert die Top-20-Torschützen mit Tor-Anzahl. Wir schreiben die Werte
// in players.tournament_goals — Trigger im DB-Schema sorgt dafür, dass danach
// score_special_tips() für jedes Turnier neu durchläuft (= Top-Scorer-Punkte
// werden live aktualisiert).
//
// Idempotent: Setzt für jeden Spieler die aktuelle Tor-Zahl (auch 0 wenn
// vorher höher → korrigiert sich selbst). Für nicht in den Top-20 gelistete
// Spieler bleibt der Wert unverändert; das ist okay, weil der Top-Scorer
// garantiert in der Top-20 ist.
//
// Ein API-Call insgesamt — kein Rate-Limit-Problem.
//
// Usage:
//   node scripts/import-top-scorers.mjs              # default WM2026
//   node scripts/import-top-scorers.mjs WM2026

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

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!API_KEY) throw new Error('API_FOOTBALL_KEY fehlt');
if (!SUPABASE_URL) throw new Error('EXPO_PUBLIC_SUPABASE_URL fehlt');
if (!SUPABASE_SERVICE_ROLE) throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt');

const TOURNAMENT = process.argv[2] ?? 'WM2026';

// Tournament → api-football Season-Jahr
const SEASON_MAP = {
  WM2026: 2026,
};
const SEASON = SEASON_MAP[TOURNAMENT];
if (!SEASON) {
  throw new Error(
    `Unbekanntes Tournament "${TOURNAMENT}". Bekannt: ${Object.keys(SEASON_MAP).join(', ')}`,
  );
}

const LEAGUE_ID = 1; // FIFA World Cup
const API_HOST = 'v3.football.api-sports.io';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

console.log(`[top-scorers] Hole Top-Torschützen für ${TOURNAMENT} (season=${SEASON})…`);

const url = `https://${API_HOST}/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`;
const res = await fetch(url, {
  headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST },
});

if (!res.ok) {
  console.error(`[top-scorers] HTTP ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const json = await res.json();
const scorers = json.response ?? [];

if (scorers.length === 0) {
  console.warn(`[top-scorers] Keine Daten — entweder Turnier noch nicht gestartet,`);
  console.warn(`              oder Season ${SEASON} nicht im Free-Plan verfügbar.`);
  console.warn(`              api-football errors:`, json.errors);
  process.exit(0);
}

console.log(`[top-scorers] ${scorers.length} Spieler aus API erhalten.`);

let updated = 0;
let skipped = 0;
let topScorer = null;

for (const entry of scorers) {
  const playerId = entry.player?.id;
  const playerName = entry.player?.name;
  // Bei mehreren Klubs sind statistics ein Array. Für ein Turnier ist es
  // immer genau ein Eintrag, aber zur Sicherheit summieren wir.
  const goals = (entry.statistics ?? []).reduce((sum, s) => sum + (s.goals?.total ?? 0), 0);

  if (!playerId) {
    skipped++;
    continue;
  }

  if (topScorer === null || goals > topScorer.goals) {
    topScorer = { id: playerId, name: playerName, goals };
  }

  const { error, count } = await supabase
    .from('players')
    .update({ tournament_goals: goals }, { count: 'exact' })
    .eq('id', playerId);

  if (error) {
    console.warn(`  ⚠️  ${playerName} (id=${playerId}): ${error.message}`);
    skipped++;
    continue;
  }

  if (count === 0) {
    console.log(`  ⏭️  ${playerName} (id=${playerId}, ${goals} Tore) — nicht in DB (Squad nicht importiert?)`);
    skipped++;
    continue;
  }

  console.log(`  ✔  ${playerName.padEnd(28)} ${String(goals).padStart(2)} Tore`);
  updated++;
}

console.log(`\n[top-scorers] ${updated} aktualisiert, ${skipped} übersprungen.`);
if (topScorer) {
  console.log(`[top-scorers] 👑 Top-Scorer laut API: ${topScorer.name} (${topScorer.goals} Tore)`);
  console.log(`              → score_special_tips() läuft via Trigger automatisch nach.`);
}
