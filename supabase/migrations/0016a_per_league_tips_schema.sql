-- Bolzify — Per-Liga-Tipps (Phase 1: Schema)
--
-- BREAKING CHANGE: tips, special_tips, group_winner_tips werden pro Liga
-- abgegeben statt global. Tippen ohne Liga-Mitgliedschaft war sinnlos —
-- Tipps liefen ins Leere. Mit Liga-Kontext zählen sie wirklich.
--
-- Aufgesplittet auf 3 Files wegen Supabase-SQL-Editor 200-Zeilen-Paste-Limit:
--   0016a — Schema (Spalten + Constraints + Indizes)
--   0016b — RLS-Policies neu
--   0016c — Scoring-Functions überschreiben
-- Reihenfolge zwingend: a → b → c.
--
-- WICHTIG: Diese Migration LÖSCHT alle bestehenden Tipps (fresh start, mit
-- User abgestimmt 2026-05-07). Die DB hat nur Test-Daten — keine echten
-- User-Tipps. Damit ersparen wir uns einen Backfill-Algorithmus für
-- "in welche Liga gehört dieser globale Tipp?".

-- 1. Alles löschen — TRUNCATE CASCADE räumt scored_* automatisch mit weg.
truncate table public.scored_special_tips cascade;
truncate table public.scored_tips cascade;
truncate table public.special_tips cascade;
truncate table public.group_winner_tips cascade;
truncate table public.tips cascade;

-- 2. tips: league_id einführen, unique-Constraint umstellen
alter table public.tips
  add column league_id uuid not null
  references public.leagues(id) on delete cascade;

alter table public.tips
  drop constraint tips_user_id_match_id_key;
alter table public.tips
  add constraint tips_user_match_league_unique
  unique (user_id, match_id, league_id);

create index tips_league_match_idx on public.tips(league_id, match_id);

-- 3. scored_tips: league_id einführen (denormalisiert aus tips für schnellen
-- Liga-Filter im Leaderboard). tip_id bleibt PK; scored_tips wird via
-- tips.league_id CASCADE mitentsorgt wenn eine Liga gelöscht wird.
alter table public.scored_tips
  add column league_id uuid not null
  references public.leagues(id) on delete cascade;

create index scored_tips_league_user_idx on public.scored_tips(league_id, user_id);

-- 4. special_tips: PK auf (user_id, tournament, league_id) erweitern.
-- Ein User kann jetzt pro Liga eigene Sondertipps haben (z.B. seriöse Liga
-- vs. Spaß-Liga unterschiedlich tippen).
alter table public.special_tips
  add column league_id uuid not null
  references public.leagues(id) on delete cascade;

alter table public.special_tips drop constraint special_tips_pkey;
alter table public.special_tips
  add constraint special_tips_pkey
  primary key (user_id, tournament, league_id);

-- 5. scored_special_tips: PK erweitern (analog).
alter table public.scored_special_tips
  add column league_id uuid not null
  references public.leagues(id) on delete cascade;

alter table public.scored_special_tips drop constraint scored_special_tips_pkey;
alter table public.scored_special_tips
  add constraint scored_special_tips_pkey
  primary key (user_id, tournament, league_id);

-- 6. group_winner_tips: PK erweitern.
alter table public.group_winner_tips
  add column league_id uuid not null
  references public.leagues(id) on delete cascade;

alter table public.group_winner_tips drop constraint group_winner_tips_pkey;
alter table public.group_winner_tips
  add constraint group_winner_tips_pkey
  primary key (user_id, tournament, league_id, group_letter);
