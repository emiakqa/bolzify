// Bolzify — Gruppen-Zuordnung der Teams aus api-football importieren.
//
// Endpoint: GET /standings?league=1&season=YYYY
// Liefert pro Gruppe ein Standings-Array; die Gruppe steckt im `group`-Feld
// (Format: "Group A" oder "World Cup - Group A"). Wir parsen den Buchstaben
// und schreiben ihn in teams.group_letter.
//
// Warum nicht aus matches.stage / fixtures? api-football setzt round =
// "Group Stage - 1" (Spieltag), NICHT "Group A". Group-Affiliation gibt's
// nur über /standings.
//
// Ein API-Call insgesamt — kein Rate-Limit-Problem.
//
// Idempotent: setzt für jeden Team-id den Buchstaben (überschreibt auch).
// K.O.-Teams (Round of 32, etc.) bleiben group_letter = NULL.
//
// Usage:
//   node scripts/import-team-groups.mjs              # default WM2026
//   node scripts/import-team-groups.mjs WM2026

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
const API_URL = `https://v3.football.api-sports.io/standings?league=${LEAGUE_ID}&season=${SEASON}`;

console.log(`→ api-football: GET /standings?league=${LEAGUE_ID}&season=${SEASON}`);
const res = await fetch(API_URL, { headers: { 'x-apisports-key': API_KEY } });
if (!res.ok) {
  throw new Error(`api-football HTTP ${res.status}: ${await res.text()}`);
}
const json = await res.json();

if (json.errors && !Array.isArray(json.errors) && Object.keys(json.errors).length > 0) {
  throw new Error(`api-football errors: ${JSON.stringify(json.errors)}`);
}

const leagues = json.response ?? [];
if (leagues.length === 0) {
  console.warn('⚠ Keine standings. Möglich: Draw nicht in api-football, oder Free-Plan ohne Pro.');
  process.exit(0);
}

// response[0].league.standings ist ein Array von Arrays — eine Tabelle pro Gruppe.
const standings = leagues[0]?.league?.standings ?? [];
console.log(`← got ${standings.length} group tables`);

// Aus "Group A" oder "World Cup - Group A" → "A"
const extractLetter = (groupField) => {
  if (!groupField) return null;
  const m = String(groupField).match(/Group\s+([A-L])\b/i);
  return m ? m[1].toUpperCase() : null;
};

// team_id → group_letter aufbauen
const updates = [];
for (const groupTable of standings) {
  for (const row of groupTable) {
    const letter = extractLetter(row.group);
    const teamId = row.team?.id;
    if (!letter || !teamId) {
      console.warn(`⚠ skipping: group=${row.group} team=${row.team?.name}`);
      continue;
    }
    updates.push({ id: teamId, name: row.team?.name, letter });
  }
}

console.log(`→ ${updates.length} Team-Group-Zuordnungen ermittelt`);
if (updates.length === 0) {
  console.warn('⚠ Nichts zum updaten. Standings-Format unerwartet?');
  process.exit(0);
}

// Verteilung nach Buchstabe
const byLetter = updates.reduce((acc, u) => {
  acc[u.letter] = (acc[u.letter] ?? 0) + 1;
  return acc;
}, {});
console.log('→ Verteilung:', byLetter);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

let updated = 0;
let missing = 0;
for (const u of updates) {
  const { data, error } = await supabase
    .from('teams')
    .update({ group_letter: u.letter })
    .eq('id', u.id)
    .eq('tournament', TOURNAMENT)
    .select('id');
  if (error) {
    console.error(`✗ ${u.name} (id=${u.id}):`, error.message);
    continue;
  }
  if (!data || data.length === 0) {
    console.warn(`⚠ ${u.name} (id=${u.id}) nicht in teams gefunden — Fixtures-Import erst laufen lassen?`);
    missing++;
    continue;
  }
  updated++;
}

console.log(`✓ ${updated} Teams aktualisiert${missing > 0 ? `, ${missing} fehlten in DB` : ''}.`);
