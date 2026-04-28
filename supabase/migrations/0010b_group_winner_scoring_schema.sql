-- Bolzify — Gruppensieger-Scoring (Schema-Erweiterung)
-- Voraussetzung: 0010_group_winner_tips.sql + 0009a/b/c wurden ausgeführt.
--
-- Punktwert (vom User entschieden 2026-04-28):
--   - Pro richtig getippter Gruppensieger:  3 P
--   - 12 Gruppen (WM2026)                 → max 36 P
--    8 Gruppen (WM2022 Dev-Daten)         → max 24 P
--
-- Wir hängen die Punkte an scored_special_tips dran, damit der bestehende
-- Liga-Ranking-Code (lädt total_points aus scored_special_tips) automatisch
-- mitsummiert. Die Generated Column muss dafür neu erzeugt werden — Postgres
-- erlaubt kein In-Place-Update auf STORED-Generated-Columns.

alter table public.scored_special_tips
  add column if not exists group_winner_hits  int not null default 0;
alter table public.scored_special_tips
  add column if not exists group_winner_points int not null default 0;

-- Generated total_points neu definieren (alte Spalte wegwerfen, neu anlegen).
-- Datenverlust unkritisch: total_points ist computed, regeneriert sich beim
-- nächsten score_special_tips()-Lauf.
alter table public.scored_special_tips
  drop column if exists total_points;

alter table public.scored_special_tips
  add column total_points int generated always as (
    champion_points
    + runner_up_points
    + semifinalist_points
    + top_scorer_points
    + group_winner_points
  ) stored;
