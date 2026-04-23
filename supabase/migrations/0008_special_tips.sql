-- Bolzify — Sondertipps (WM-Sieger, Torschützenkönig, Halbfinal-/Finalteilnehmer)
--
-- Kicktipp-Style: ein Turniertipp pro User. Wird **vor** dem ersten Spiel
-- des Turniers abgegeben, danach gelockt (Client + RLS).
--
-- Ein Row pro (user_id, tournament). Felder sind alle nullable — der User
-- kann schrittweise ausfüllen und speichern.
--
-- Scoring-Migration kommt separat — erstmal nur Speicher + UI.

create table if not exists public.special_tips (
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  tournament              text not null default 'WM2026',
  champion_team_id        int  references public.teams(id),
  runner_up_team_id       int  references public.teams(id),
  semifinalist_a_team_id  int  references public.teams(id),  -- 3. Halbfinalist (neben Champion + Runner-up)
  semifinalist_b_team_id  int  references public.teams(id),  -- 4. Halbfinalist
  top_scorer_player_id    bigint references public.players(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  primary key (user_id, tournament)
);

-- Deadline-Helper: liefert den Anpfiff des ersten Matches eines Turniers.
-- NULL, wenn das Turnier noch gar keine Fixtures hat (z.B. WM2026 vor
-- Auslosung) — dann ist jederzeit Tippen erlaubt.
create or replace function public.special_tips_deadline(p_tournament text)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select min(kickoff_at)
  from public.matches
  where tournament = p_tournament;
$$;

grant execute on function public.special_tips_deadline(text) to authenticated;

-- updated_at automatisch pflegen
create or replace function public.touch_special_tips()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_special_tips on public.special_tips;
create trigger trg_touch_special_tips
  before update on public.special_tips
  for each row execute function public.touch_special_tips();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.special_tips enable row level security;

-- Lesen: eigenen Tipp immer. Fremde Tipps erst nach Deadline (analog zu tips).
drop policy if exists "special_tips self read" on public.special_tips;
create policy "special_tips self read"
  on public.special_tips for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "special_tips public after deadline" on public.special_tips;
create policy "special_tips public after deadline"
  on public.special_tips for select to authenticated
  using (
    public.special_tips_deadline(tournament) is not null
    and public.special_tips_deadline(tournament) <= now()
  );

-- Insert/Update nur eigener Row, nur vor Deadline.
drop policy if exists "special_tips self insert" on public.special_tips;
create policy "special_tips self insert"
  on public.special_tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
  );

drop policy if exists "special_tips self update" on public.special_tips;
create policy "special_tips self update"
  on public.special_tips for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
  );

drop policy if exists "special_tips self delete" on public.special_tips;
create policy "special_tips self delete"
  on public.special_tips for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Account-Löschung auch für Sondertipps
-- (Zusätzlich zu ON DELETE CASCADE via profiles-FK — belt and suspenders.)
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

  delete from public.special_tips where user_id = v_user;
  delete from public.scored_tips where user_id = v_user;
  delete from public.tips where user_id = v_user;
  delete from public.league_members where user_id = v_user;
  delete from public.leagues where created_by = v_user;

  delete from public.profiles where id = v_user;

  delete from auth.users where id = v_user;
end;
$$;
