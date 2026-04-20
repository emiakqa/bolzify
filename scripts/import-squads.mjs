// Bolzify — Kader aller Teams aus api-football.com importieren
//
// Voraussetzung: teams-Tabelle ist gefüllt (via scripts/import-fixtures.mjs).
// Ein API-Call pro Team (=~32 für eine WM), 100/Tag im Free-Plan.
//
// Rate-Limit Free-Plan: 10 req/min. Wir halten 6.5s Abstand + 429-Retry
// mit 65s Backoff. Script ist idempotent — bereits importierte Teams
// werden übersprungen, bei Re-Run zählen nur neue API-Calls.
//
// Usage:
//   node scripts/import-squads.mjs                 # alle Teams aller Turniere
//   node scripts/import-squads.mjs WM2022          # nur Teams dieses Turniers
//   node scripts/import-squads.mjs WM2022 --force  # auch bereits importierte
//
// Hinweise:
// - /players/squads liefert den AKTUELLEN Kader, nicht historisch. Für Dev
//   (WM2022) bedeutet das: Kader-Stand 2026, nicht Katar — für Flow-Testing ok.
// - Für echte WM 2026 ~2 Wochen vor Start laufen lassen, wenn Kader offiziell.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// --- .env laden ---
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

if (!API_KEY) throw new Error('API_FOOTBALL_KEY fehlt in .env');
if (!SUPABASE_URL) throw new Error('EXPO_PUBLIC_SUPABASE_URL fehlt in .env');
if (!SUPABASE_SERVICE_ROLE) throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt in .env');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const TOURNAMENT_FILTER = args.find((a) => !a.startsWith('--')) ?? null;

// Puffer, um unter 10 req/min zu bleiben (10 req/min = 1 alle 6s).
const CALL_GAP_MS = 6500;
const RETRY_BACKOFF_MS = 65_000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

let teamsQuery = supabase.from('teams').select('id, name, tournament').order('id');
if (TOURNAMENT_FILTER) teamsQuery = teamsQuery.eq('tournament', TOURNAMENT_FILTER);
const { data: allTeams, error: teamsErr } = await teamsQuery;
if (teamsErr) throw new Error(`teams select error: ${teamsErr.message}`);
if (!allTeams || allTeams.length === 0) {
  console.warn('⚠ Keine Teams in DB. Erst `node scripts/import-fixtures.mjs` laufen lassen.');
  process.exit(0);
}

// Idempotenz: Teams mit bereits importierten Spielern überspringen (außer --force).
let teams = allTeams;
if (!FORCE) {
  const { data: existing } = await supabase
    .from('players')
    .select('team_id')
    .in('team_id', allTeams.map((t) => t.id));
  const haveSquad = new Set((existing ?? []).map((r) => r.team_id));
  const skipped = allTeams.filter((t) => haveSquad.has(t.id));
  teams = allTeams.filter((t) => !haveSquad.has(t.id));
  if (skipped.length > 0) {
    console.log(`↷ Überspringe ${skipped.length} bereits importierte Teams: ${skipped.map((t) => t.name).join(', ')}`);
    console.log(`  (--force, um sie trotzdem zu refreshen)`);
  }
}

if (teams.length === 0) {
  console.log('✓ Alles schon importiert, nichts zu tun.');
  process.exit(0);
}

const eta = Math.ceil((teams.length * CALL_GAP_MS) / 1000);
console.log(`→ ${teams.length} Teams zu importieren${TOURNAMENT_FILTER ? ` (Turnier ${TOURNAMENT_FILTER})` : ''}, ~${eta}s ETA`);

async function fetchSquad(teamId) {
  const url = `https://v3.football.api-sports.io/players/squads?team=${teamId}`;
  return fetch(url, { headers: { 'x-apisports-key': API_KEY } });
}

let totalPlayers = 0;
let remaining = '?';
let failures = 0;

for (let i = 0; i < teams.length; i++) {
  const team = teams[i];

  // 1. Versuch
  let res = await fetchSquad(team.id);

  // Auf 429 einmal warten und erneut versuchen
  if (res.status === 429) {
    console.log(`  … ${team.name}: 429, warte ${RETRY_BACKOFF_MS / 1000}s und retry`);
    await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
    res = await fetchSquad(team.id);
  }

  remaining = res.headers.get('x-ratelimit-requests-remaining') ?? remaining;

  if (!res.ok) {
    console.warn(`  ✗ ${team.name}: HTTP ${res.status}`);
    failures++;
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
    continue;
  }
  const data = await res.json();
  const squad = data.response?.[0]?.players ?? [];

  if (squad.length === 0) {
    console.warn(`  · ${team.name}: kein Squad zurückgegeben`);
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
    continue;
  }

  const rows = squad.map((p) => ({
    id: p.id,
    team_id: team.id,
    name: p.name,
    number: p.number ?? null,
    position: p.position ?? null,
    photo_url: p.photo ?? null,
  }));

  const { error: upErr } = await supabase.from('players').upsert(rows, { onConflict: 'id' });
  if (upErr) {
    console.warn(`  ✗ ${team.name} upsert: ${upErr.message}`);
    failures++;
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
    continue;
  }

  totalPlayers += rows.length;
  console.log(`  ✓ [${i + 1}/${teams.length}] ${team.name}: ${rows.length} Spieler (quota left: ${remaining})`);

  // Rate-Limit Puffer (nicht beim letzten Team)
  if (i < teams.length - 1) {
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
  }
}

const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
console.log(`\n✓ done — ${totalPlayers} neue Spieler, players-Tabelle enthält jetzt ${count}`);
console.log(`  API-Quota remaining: ${remaining}${failures > 0 ? `, ${failures} Team(s) fehlgeschlagen — erneut ausführen` : ''}`);
