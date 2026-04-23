-- Bolzify — Sondertipps-Scoring (Teil C: Trigger + RLS + delete_own_account)
-- Voraussetzung: 0009a + 0009b wurden ausgeführt.

-- ============================================================================
-- Auto-Trigger
-- ============================================================================

-- Trigger 1: Match wechselt auf finished UND ist KO-Stage (HF oder Final)
-- → für dieses Turnier neu scoren. Viertel-/Achtelfinale beeinflussen die
-- Sondertipps nicht und werden ignoriert.
create or replace function public.trigger_score_special_tips_on_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished'
     and new.stage in ('Final', 'Semi-finals')
     and (
       old.status is distinct from 'finished'
       or old.home_goals is distinct from new.home_goals
       or old.away_goals is distinct from new.away_goals
       or old.winner_team_id is distinct from new.winner_team_id
     )
  then
    perform public.score_special_tips(new.tournament);
  end if;
  return new;
end;
$$;

drop trigger if exists matches_auto_score_special on public.matches;
create trigger matches_auto_score_special
  after update on public.matches
  for each row
  execute function public.trigger_score_special_tips_on_match();

-- Trigger 2: tournament_goals ändert sich → alle Turniere neu scoren.
-- Statement-level (nicht row-level), damit Bulk-Updates aus dem Importer
-- nur EINEN Funktionsaufruf auslösen statt N.
create or replace function public.trigger_score_special_tips_on_top_scorer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament text;
begin
  for v_tournament in select distinct tournament from public.special_tips loop
    perform public.score_special_tips(v_tournament);
  end loop;
  return null;
end;
$$;

drop trigger if exists players_auto_score_special on public.players;
create trigger players_auto_score_special
  after update of tournament_goals on public.players
  for each statement
  execute function public.trigger_score_special_tips_on_top_scorer();

-- ============================================================================
-- RLS für scored_special_tips
-- ============================================================================

alter table public.scored_special_tips enable row level security;

-- Eigene Punkte immer lesbar
drop policy if exists "scored_special_tips self read" on public.scored_special_tips;
create policy "scored_special_tips self read"
  on public.scored_special_tips for select to authenticated
  using (user_id = auth.uid());

-- Fremde Punkte lesbar nach Sondertipp-Deadline (= Turnierstart),
-- analog zu special_tips public-after-deadline.
drop policy if exists "scored_special_tips public after deadline" on public.scored_special_tips;
create policy "scored_special_tips public after deadline"
  on public.scored_special_tips for select to authenticated
  using (
    public.special_tips_deadline(tournament) is not null
    and public.special_tips_deadline(tournament) <= now()
  );

-- Kein Insert/Update/Delete via Client — nur via Function (security definer).

-- ============================================================================
-- delete_own_account erweitern (scored_special_tips räumen)
-- ============================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  delete from public.scored_special_tips where user_id = v_user;
  delete from public.special_tips where user_id = v_user;
  delete from public.scored_tips where user_id = v_user;
  delete from public.tips where user_id = v_user;
  delete from public.league_members where user_id = v_user;
  delete from public.leagues where created_by = v_user;

  delete from public.profiles where id = v_user;

  delete from auth.users where id = v_user;
end;
$$;
