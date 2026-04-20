// Bolzify — Kader aller Teams aus api-football.com importieren
//
// Voraussetzung: teams-Tabelle ist gefüllt (via scripts/import-fixtures.mjs).
// Ein API-Call pro Team (=~32 für eine WM), 100/Tag im Free-Plan.
//
// Usage:
//   node scripts/import-squads.mjs            # alle Teams aller Turniere
//   node scripts/import-squads.mjs WM2022     # nur Teams dieses Turniers
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

const TOURNAMENT_FILTER = process.argv[2] ?? null;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

let teamsQuery = supabase.from('teams').select('id, name, tournament').order('id');
if (TOURNAMENT_FILTER) teamsQuery = teamsQuery.eq('tournament', TOURNAMENT_FILTER);
const { data: teams, error: teamsErr } = await teamsQuery;
if (teamsErr) throw new Error(`teams select error: ${teamsErr.message}`);
if (!teams || teams.length === 0) {
  console.warn('⚠ Keine Teams in DB. Erst `node scripts/import-fixtures.mjs` laufen lassen.');
  process.exit(0);
}

console.log(`→ ${teams.length} Teams zu importieren${TOURNAMENT_FILTER ? ` (Turnier ${TOURNAMENT_FILTER})` : ''}`);

let totalPlayers = 0;
let remaining = '?';

for (let i = 0; i < teams.length; i++) {
  const team = teams[i];
  const url = `https://v3.football.api-sports.io/players/squads?team=${team.id}`;
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  remaining = res.headers.get('x-ratelimit-requests-remaining') ?? '?';

  if (!res.ok) {
    console.warn(`  ✗ ${team.name}: HTTP ${res.status}`);
    continue;
  }
  const data = await res.json();
  const squad = data.response?.[0]?.players ?? [];

  if (squad.length === 0) {
    console.warn(`  · ${team.name}: kein Squad zurückgegeben`);
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
    continue;
  }

  totalPlayers += rows.length;
  console.log(`  ✓ [${i + 1}/${teams.length}] ${team.name}: ${rows.length} Spieler (quota left: ${remaining})`);

  // Free-Plan: 10 req/min Rate-Limit. 300ms Puffer ist sicher.
  await new Promise((r) => setTimeout(r, 300));
}

const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
console.log(`\n✓ done — ${totalPlayers} Spieler importiert, players-Tabelle enthält jetzt ${count}`);
console.log(`  API-Quota remaining: ${remaining}`);
