-- Bolzify — WM2022 Dev-Daten entfernen
--
-- WM2022 war ein Dev-Stub für Flow-Testing solange WM2026-Fixtures nicht
-- offiziell waren. Da WM2026-Daten jetzt in der DB liegen, kann WM2022
-- komplett raus — sonst zeigt z.B. der Sondertipp-Screen oder das Ranking
-- gemischte Daten an.
--
-- Idempotent: kann mehrfach laufen, jedes DELETE ist no-op bei 0 Rows.
--
-- Reihenfolge wichtig wegen FK-Constraints:
--   special_tips/group_winner_tips → teams (kein cascade)
--   matches → teams (kein cascade auf home/away_team_id)
--   tips/scored_tips → matches (CASCADE, also automatisch)
--   players → teams (CASCADE)

-- 1) Tipp-Tabellen die teams referenzieren
delete from public.group_winner_tips    where tournament = 'WM2022';
delete from public.scored_special_tips  where tournament = 'WM2022';
delete from public.special_tips         where tournament = 'WM2022';

-- 2) Matches (löscht via cascade: tips, scored_tips dieser Matches)
delete from public.matches where tournament = 'WM2022';

-- 3) Players explizit (technisch redundant via cascade auf teams,
--    aber sauberer wenn jemand teams.tournament FK ändert)
delete from public.players p
  using public.teams t
 where p.team_id = t.id
   and t.tournament = 'WM2022';

-- 4) Teams (jetzt unreferenziert)
delete from public.teams where tournament = 'WM2022';

-- 5) Ligen die ans Dev-Turnier gebunden waren (selten, aber komplett putzen)
delete from public.leagues where tournament = 'WM2022';

-- Sanity-Check: alle Counts müssen 0 sein
do $$
declare
  v_teams int;
  v_matches int;
  v_specials int;
  v_groups int;
  v_leagues int;
begin
  select count(*) into v_teams    from public.teams              where tournament = 'WM2022';
  select count(*) into v_matches  from public.matches            where tournament = 'WM2022';
  select count(*) into v_specials from public.special_tips       where tournament = 'WM2022';
  select count(*) into v_groups   from public.group_winner_tips  where tournament = 'WM2022';
  select count(*) into v_leagues  from public.leagues            where tournament = 'WM2022';
  raise notice 'WM2022 Cleanup: teams=%, matches=%, special_tips=%, group_tips=%, leagues=% (alle 0 erwartet)',
    v_teams, v_matches, v_specials, v_groups, v_leagues;
end $$;
