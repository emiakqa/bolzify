-- Bolzify — Teams + Players (Tag 6, Torschützen-Dropdown)
--
-- Vorher: first_scorer war Freitext → fehleranfällig, nicht joinbar,
-- keine Statistiken möglich. Jetzt: echte Tabellen mit den api-football IDs.
--
-- Teams werden beim Fixture-Import automatisch mitgepflegt.
-- Squads kommen via separatem scripts/import-squads.mjs (nur manuell laufen).

create table if not exists public.teams (
  id         int primary key,              -- api-football team id
  name       text not null,
  code       text,                         -- 3-letter country code (optional)
  logo_url   text,
  tournament text not null default 'WM2026'
);

create table if not exists public.players (
  id         bigint primary key,           -- api-football player id
  team_id    int not null references public.teams(id) on delete cascade,
  name       text not null,
  number     int,
  position   text,
  photo_url  text,
  created_at timestamptz not null default now()
);

create index if not exists players_team_idx on public.players(team_id);
create index if not exists players_name_idx on public.players(name);

-- matches um team-IDs ergänzen (nullable, damit Migration auf bestehende Rows läuft).
-- Fixture-Re-Import füllt die auf.
alter table public.matches
  add column if not exists home_team_id int references public.teams(id),
  add column if not exists away_team_id int references public.teams(id),
  add column if not exists first_scorer_id bigint references public.players(id);

-- tips: strukturierter Torschützen-FK. first_scorer (text) bleibt vorerst als
-- Fallback/Legacy — neue Tipps schreiben first_scorer_id, Scoring vergleicht IDs.
alter table public.tips
  add column if not exists first_scorer_id bigint references public.players(id);

-- RLS
alter table public.teams   enable row level security;
alter table public.players enable row level security;

create policy "teams readable by authenticated"
  on public.teams for select to authenticated using (true);

create policy "players readable by authenticated"
  on public.players for select to authenticated using (true);
