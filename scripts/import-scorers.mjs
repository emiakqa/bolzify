// Bolzify — Ersten Torschützen pro Match aus api-football importieren.
//
// Der /fixtures-Endpoint liefert nur Endstände. Wer das erste Tor gemacht hat,
// steckt in /fixtures/events?fixture=ID — ein Call pro Match.
//
// Rate-Limit: 10 req/min Free-Plan → 6.5s Gap, 65s 429-Backoff.
// Idempotent: überspringt Matches, die schon first_scorer_id haben, außer --force.
// Nur finished matches.
//
// Usage:
//   node scripts/import-scorers.mjs                    # alle finished matches
//   node scripts/import-scorers.mjs WM2026             # nur Turnier
//   node scripts/import-scorers.mjs WM2026 --force     # auch schon importierte refreshen
//
// Nach Import: `node scripts/score-backfill.mjs` ausführen, damit der Bonus
// in scored_tips einfließt.

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

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const TOURNAMENT_FILTER = args.find((a) => !a.startsWith('--')) ?? null;

const CALL_GAP_MS = 6500;
const RETRY_BACKOFF_MS = 65_000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

let q = supabase
  .from('matches')
  .select('id, home_team, away_team, first_scorer_id')
  .eq('status', 'finished')
  .order('kickoff_at');
if (TOURNAMENT_FILTER) q = q.eq('tournament', TOURNAMENT_FILTER);

const { data: allMatches, error: mErr } = await q;
if (mErr) throw new Error(`matches select: ${mErr.message}`);
if (!allMatches || allMatches.length === 0) {
  console.log('→ Keine finished matches.');
  process.exit(0);
}

let matches = allMatches;
if (!FORCE) {
  const skipped = matches.filter((m) => m.first_scorer_id !== null);
  matches = matches.filter((m) => m.first_scorer_id === null);
  if (skipped.length > 0) {
    console.log(`↷ Überspringe ${skipped.length} Matches mit bereits gesetztem first_scorer_id (--force zum Refreshen)`);
  }
}

if (matches.length === 0) {
  console.log('✓ Alles schon importiert.');
  process.exit(0);
}

const eta = Math.ceil((matches.length * CALL_GAP_MS) / 1000);
console.log(`→ ${matches.length} Matches, ~${eta}s ETA${TOURNAMENT_FILTER ? ` (Turnier ${TOURNAMENT_FILTER})` : ''}`);

async function fetchEvents(matchId) {
  return fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${matchId}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
}

function firstGoalScorerId(events) {
  // type === 'Goal' (inkl. 'Own Goal', 'Penalty'). Frühester Event nach Minute.
  const goals = events.filter((e) => e.type === 'Goal');
  if (goals.length === 0) return null;
  goals.sort((a, b) => {
    const aMin = (a.time?.elapsed ?? 0) + (a.time?.extra ?? 0);
    const bMin = (b.time?.elapsed ?? 0) + (b.time?.extra ?? 0);
    return aMin - bMin;
  });
  return goals[0].player?.id ?? null;
}

let remaining = '?';
let updates = 0;
let noGoals = 0;
let failures = 0;

for (let i = 0; i < matches.length; i++) {
  const m = matches[i];
  let res = await fetchEvents(m.id);
  if (res.status === 429) {
    console.log(`  … ${m.home_team} vs ${m.away_team}: 429, wait ${RETRY_BACKOFF_MS / 1000}s`);
    await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
    res = await fetchEvents(m.id);
  }
  remaining = res.headers.get('x-ratelimit-requests-remaining') ?? remaining;

  if (!res.ok) {
    console.warn(`  ✗ ${m.home_team} vs ${m.away_team}: HTTP ${res.status}`);
    failures++;
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
    continue;
  }

  const data = await res.json();
  const scorerId = firstGoalScorerId(data.response ?? []);

  if (!scorerId) {
    console.log(`  · [${i + 1}/${matches.length}] ${m.home_team} vs ${m.away_team}: kein Torschütze (0:0?)`);
    noGoals++;
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
    continue;
  }

  const { error: upErr } = await supabase
    .from('matches')
    .update({ first_scorer_id: scorerId })
    .eq('id', m.id);

  if (upErr) {
    console.warn(`  ✗ ${m.home_team} vs ${m.away_team} update: ${upErr.message}`);
    failures++;
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
    continue;
  }

  updates++;
  console.log(`  ✓ [${i + 1}/${matches.length}] ${m.home_team} vs ${m.away_team}: scorer ${scorerId} (quota left: ${remaining})`);

  if (i < matches.length - 1) {
    await new Promise((r) => setTimeout(r, CALL_GAP_MS));
  }
}

console.log(`\n✓ done — ${updates} Matches gesetzt, ${noGoals} ohne Torschütze, ${failures} fehlgeschlagen`);
console.log(`  Jetzt: node scripts/score-backfill.mjs  (damit der Bonus in scored_tips landet)`);
