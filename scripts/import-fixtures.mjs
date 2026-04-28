// Bolzify — WM-2026-Spielplan aus api-football.com importieren
//
// Lokal ausführen (NICHT auf dem Handy / im App-Code!):
//   node scripts/import-fixtures.mjs
//
// Benötigt in .env:
//   API_FOOTBALL_KEY=...
//   EXPO_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...  (bypassed RLS, NIEMALS in Client-Code!)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ---- .env manuell einlesen (kein dotenv dep) ----
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

// FIFA World Cup = league 1 bei api-football.com
// Season via CLI: `node scripts/import-fixtures.mjs 2022`. Default 2026.
// Hinweis: Free-Plan deckt nur Seasons 2022–2024. WM 2026 braucht Pro.
const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2] ?? '2026', 10);
const TOURNAMENT_TAG = SEASON === 2026 ? 'WM2026' : `WM${SEASON}`;
// Direkter Endpoint für api-football.com-Dashboard-Keys.
// (Über RapidAPI wäre der Host: v3.football.api-football.com — anderer Key-Typ.)
const API_URL = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`;

const mapStatus = (short) => {
  if (['NS', 'TBD', 'PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(short)) return 'scheduled';
  if (['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'INT'].includes(short)) return 'live';
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished';
  return 'scheduled';
};

// --- Diagnose: Key-Format prüfen, /status-Endpoint callen ---
console.log(`→ API_FOOTBALL_KEY: length=${API_KEY.length}, first4=${API_KEY.slice(0, 4)}, last4=${API_KEY.slice(-4)}`);
if (API_KEY.startsWith('"') || API_KEY.endsWith('"')) {
  console.warn('⚠ Key enthält Anführungszeichen — entferne die " in der .env');
}

const statusRes = await fetch('https://v3.football.api-sports.io/status', {
  headers: { 'x-apisports-key': API_KEY },
});
const statusBody = await statusRes.text();
console.log(`→ /status HTTP ${statusRes.status}: ${statusBody.slice(0, 400)}`);
if (!statusRes.ok) {
  throw new Error('Key wird abgelehnt. Prüfe: (1) Key ohne "" in .env, (2) Key stammt von https://dashboard.api-football.com/profile (NICHT RapidAPI), (3) Account per E-Mail bestätigt.');
}

console.log(`→ api-football.com: fetching league=${LEAGUE_ID} season=${SEASON}`);
const res = await fetch(API_URL, { headers: { 'x-apisports-key': API_KEY } });
if (!res.ok) {
  throw new Error(`api-football HTTP ${res.status}: ${await res.text()}`);
}
const data = await res.json();

if (data.errors && Array.isArray(data.errors) === false && Object.keys(data.errors).length > 0) {
  throw new Error(`api-football errors: ${JSON.stringify(data.errors)}`);
}

const fixtures = data.response ?? [];
console.log(`← got ${fixtures.length} fixtures  (remaining quota: ${res.headers.get('x-ratelimit-requests-remaining') ?? '?'})`);

if (fixtures.length === 0) {
  console.warn('⚠ Keine Fixtures. Möglich: Draw noch nicht in api-football hinterlegt, falscher Season-Wert, oder Free-Plan hat Competition 1 nicht.');
  process.exit(0);
}

// Unique-Teams für teams-Upsert sammeln (eine Row pro Team).
const teamMap = new Map();
for (const f of fixtures) {
  for (const side of ['home', 'away']) {
    const t = f.teams?.[side];
    if (!t?.id) continue;
    if (!teamMap.has(t.id)) {
      teamMap.set(t.id, {
        id: t.id,
        name: t.name ?? 'TBD',
        code: null,
        logo_url: t.logo ?? null,
        tournament: TOURNAMENT_TAG,
      });
    }
  }
}
const teams = Array.from(teamMap.values());

const rows = fixtures.map((f) => {
  // winner_team_id: api-football setzt teams.{home,away}.winner = true beim
  // Sieger eines KO-Spiels. Bei Gruppen-Unentschieden sind beide false/null.
  // Bei Gruppen-Siegen ist es auch true → wir setzen es trotzdem (schadet
  // nicht, ist nur für KO relevant). Bei Elfmeterschießen liefert api-football
  // den Sieger korrekt (z.B. home=Sieger.winner=true obwohl goals 3:3) —
  // genau das brauchen wir für score_special_tips().
  let winner_team_id = null;
  if (f.teams.home?.winner === true) winner_team_id = f.teams.home.id ?? null;
  else if (f.teams.away?.winner === true) winner_team_id = f.teams.away.id ?? null;

  return {
    id: f.fixture.id,
    tournament: TOURNAMENT_TAG,
    kickoff_at: f.fixture.date,
    home_team: f.teams.home?.name ?? 'TBD',
    away_team: f.teams.away?.name ?? 'TBD',
    home_team_id: f.teams.home?.id ?? null,
    away_team_id: f.teams.away?.id ?? null,
    home_team_code: null,
    away_team_code: null,
    stage: f.league?.round ?? null,
    status: mapStatus(f.fixture.status?.short ?? 'NS'),
    home_goals: f.goals?.home ?? null,
    away_goals: f.goals?.away ?? null,
    winner_team_id,
    first_scorer: null,
    updated_at: new Date().toISOString(),
  };
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

console.log(`→ Supabase upsert: ${teams.length} teams`);
const { error: teamsErr } = await supabase.from('teams').upsert(teams, { onConflict: 'id' });
if (teamsErr) throw new Error(`teams upsert error: ${teamsErr.message}`);

console.log(`→ Supabase upsert: ${rows.length} matches`);
const { error } = await supabase.from('matches').upsert(rows, { onConflict: 'id' });
if (error) throw new Error(`Supabase upsert error: ${error.message}`);

const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true });
console.log(`✓ done — matches-Tabelle enthält jetzt ${count} Zeilen, teams ${teams.length}`);
