-- Bolzify — Gruppensieger-Tipps (Sondertipp-Erweiterung)
--
-- Pro Gruppe (A..L bei WM2026, A..H bei WM2022) tippt der User EIN Team
-- als Gruppensieger. Eigenständige Tabelle statt Spalten in special_tips,
-- weil die Anzahl der Gruppen pro Turnier variiert (12 vs. 8) und wir uns
-- so von hard-coded Spaltenexplosion fernhalten.
--
-- Deadline + Lock-Verhalten = identisch zu special_tips: erlaubt nur vor
-- dem ersten Anpfiff des Turniers, danach gelockt (Client + RLS).

create table if not exists public.group_winner_tips (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  tournament    text not null default 'WM2026',
  group_letter  text not null check (group_letter ~ '^[A-L]$'),
  team_id       int  not null references public.teams(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, tournament, group_letter)
);
create index if not exists group_winner_tips_user_idx on public.group_winner_tips(user_id);
create index if not exists group_winner_tips_group_idx on public.group_winner_tips(tournament, group_letter);

-- updated_at automatisch pflegen
create or replace function public.touch_group_winner_tips()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_group_winner_tips on public.group_winner_tips;
create trigger trg_touch_group_winner_tips
  before update on public.group_winner_tips
  for each row execute function public.touch_group_winner_tips();

-- ============================================================================
-- RLS — exakt wie special_tips
-- ============================================================================
alter table public.group_winner_tips enable row level security;

-- Eigene Tipps immer lesbar
drop policy if exists "group_winner_tips self read" on public.group_winner_tips;
create policy "group_winner_tips self read"
  on public.group_winner_tips for select to authenticated
  using (user_id = auth.uid());

-- Fremde Tipps erst nach Sondertipp-Deadline (= Turnierstart)
drop policy if exists "group_winner_tips public after deadline" on public.group_winner_tips;
create policy "group_winner_tips public after deadline"
  on public.group_winner_tips for select to authenticated
  using (
    public.special_tips_deadline(tournament) is not null
    and public.special_tips_deadline(tournament) <= now()
  );

-- Insert/Update/Delete nur eigene Row, nur vor Deadline
drop policy if exists "group_winner_tips self insert" on public.group_winner_tips;
create policy "group_winner_tips self insert"
  on public.group_winner_tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
  );

drop policy if exists "group_winner_tips self update" on public.group_winner_tips;
create policy "group_winner_tips self update"
  on public.group_winner_tips for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
  );

drop policy if exists "group_winner_tips self delete" on public.group_winner_tips;
create policy "group_winner_tips self delete"
  on public.group_winner_tips for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- delete_own_account erweitern
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
  delete from public.group_winner_tips where user_id = v_user;
  delete from public.special_tips where user_id = v_user;
  delete from public.scored_tips where user_id = v_user;
  delete from public.tips where user_id = v_user;
  delete from public.league_members where user_id = v_user;
  delete from public.leagues where created_by = v_user;

  delete from public.profiles where id = v_user;

  delete from auth.users where id = v_user;
end;
$$;
