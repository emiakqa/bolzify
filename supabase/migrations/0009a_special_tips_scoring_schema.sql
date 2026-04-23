-- Bolzify — Sondertipps-Scoring (Teil A: Schema)
--
-- Wegen Supabase-SQL-Editor 200-Zeilen-Paste-Limit auf 3 Files gesplittet:
--   0009a — Schema-Erweiterungen + scored_special_tips Tabelle
--   0009b — score_special_tips() Function (die Engine)
--   0009c — Auto-Trigger + RLS + delete_own_account erweitern
--
-- Reihenfolge zwingend: a → b → c (b braucht Tabelle aus a, c braucht
-- Function aus b).
--
-- Punktwerte (vom User entschieden 2026-04-23):
--   - Weltmeister (champion_team_id) richtig:        10 P
--   - Vizeweltmeister (runner_up_team_id) richtig:    5 P
--   - Halbfinalist (jedes der 4 Felder):              5 P pro Treffer (max 4 = 20)
--   - Torschützenkönig (top_scorer_player_id):        5 P
--   - Maximum:                                       40 P (10 + 5 + 4*5 + 5)

-- ============================================================================
-- Schema-Erweiterungen
-- ============================================================================

-- Sieger-Marker für KO-Spiele (Final, Halbfinale, Viertelfinale, Achtelfinale).
-- NULL für Gruppenspiele oder noch nicht entschiedene KO-Spiele. Bei nicht-NULL
-- gewinnt das Team — auch wenn home_goals == away_goals (Elfmeterschießen).
alter table public.matches
  add column if not exists winner_team_id int references public.teams(id);

-- Anzahl Tore eines Spielers im aktuellen Turnier. Wird via
-- scripts/import-top-scorers.mjs aus api-football's /players/topscorers
-- gefüttert. Top-Scorer-Bestimmung: ORDER BY tournament_goals DESC LIMIT 1.
alter table public.players
  add column if not exists tournament_goals int not null default 0;

-- ============================================================================
-- scored_special_tips
-- ============================================================================

create table if not exists public.scored_special_tips (
  user_id              uuid not null references public.profiles(id) on delete cascade,
  tournament           text not null,
  champion_points      int  not null default 0,  -- 0 oder 10
  runner_up_points     int  not null default 0,  -- 0 oder 5
  semifinalist_hits    int  not null default 0,  -- 0..4
  semifinalist_points  int  not null default 0,  -- = hits * 5
  top_scorer_points    int  not null default 0,  -- 0 oder 5
  total_points         int  generated always as
    (champion_points + runner_up_points + semifinalist_points + top_scorer_points) stored,
  scored_at            timestamptz not null default now(),
  primary key (user_id, tournament)
);
