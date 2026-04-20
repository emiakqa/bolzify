-- ============================================================
-- Bolzify — Initial Schema (Woche 1, Tag 2)
-- 6 Tabellen: profiles, leagues, league_members, matches, tips, scored_tips
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles  — 1:1 zu auth.users, enthält Username + Avatar
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null check (char_length(username) between 3 and 20),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile beim Signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2) leagues  — Tipp-Ligen (privat, per Invite-Code)
-- ------------------------------------------------------------
create table public.leagues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 40),
  invite_code   text unique not null,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  tournament    text not null default 'WM2026',  -- später erweiterbar
  created_at    timestamptz not null default now()
);

create index leagues_created_by_idx on public.leagues(created_by);
create index leagues_invite_code_idx on public.leagues(invite_code);

-- ------------------------------------------------------------
-- 3) league_members  — Wer ist in welcher Liga?
-- ------------------------------------------------------------
create table public.league_members (
  league_id   uuid not null references public.leagues(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index league_members_user_idx on public.league_members(user_id);

-- ------------------------------------------------------------
-- 4) matches  — WM-2026-Spielplan (gefüllt aus api-football.com)
-- ------------------------------------------------------------
create table public.matches (
  id              bigint primary key,           -- api-football fixture id
  tournament      text not null default 'WM2026',
  kickoff_at      timestamptz not null,
  home_team       text not null,
  away_team       text not null,
  home_team_code  text,                         -- z.B. 'GER'
  away_team_code  text,
  stage           text,                         -- 'Group A', 'Round of 16', ...
  status          text not null default 'scheduled',  -- scheduled | live | finished
  home_goals      int,
  away_goals      int,
  first_scorer    text,                         -- name des ersten Torschützen
  updated_at      timestamptz not null default now()
);

create index matches_kickoff_idx on public.matches(kickoff_at);
create index matches_status_idx on public.matches(status);

-- ------------------------------------------------------------
-- 5) tips  — User-Tipps pro Match
-- ------------------------------------------------------------
create table public.tips (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  match_id        bigint not null references public.matches(id) on delete cascade,
  home_goals      int not null check (home_goals >= 0 and home_goals <= 20),
  away_goals      int not null check (away_goals >= 0 and away_goals <= 20),
  first_scorer    text,                         -- optional Torschützen-Bonus
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, match_id)
);

create index tips_match_idx on public.tips(match_id);
create index tips_user_idx on public.tips(user_id);

-- ------------------------------------------------------------
-- 6) scored_tips  — Berechnete Punkte (nach Abpfiff)
-- ------------------------------------------------------------
create table public.scored_tips (
  tip_id          uuid primary key references public.tips(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  match_id        bigint not null references public.matches(id) on delete cascade,
  points          int not null default 0,       -- 0/2/4/6
  scorer_bonus    int not null default 0,       -- 0 oder 3
  total_points    int generated always as (points + scorer_bonus) stored,
  scored_at       timestamptz not null default now()
);

create index scored_tips_user_idx on public.scored_tips(user_id);
create index scored_tips_match_idx on public.scored_tips(match_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.leagues         enable row level security;
alter table public.league_members  enable row level security;
alter table public.matches         enable row level security;
alter table public.tips            enable row level security;
alter table public.scored_tips     enable row level security;

-- ------------------------------------------------------------
-- profiles: alle eingeloggten User können alle Profile lesen
-- (damit Ligen-Tabellen Usernamen anzeigen können)
-- ------------------------------------------------------------
create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles updatable by owner"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- leagues: sichtbar für Mitglieder; Ersteller darf alles
-- ------------------------------------------------------------
create policy "leagues readable by members"
  on public.leagues for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.league_members
      where league_id = leagues.id and user_id = auth.uid()
    )
  );

create policy "leagues insertable by authenticated"
  on public.leagues for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "leagues updatable by creator"
  on public.leagues for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "leagues deletable by creator"
  on public.leagues for delete
  to authenticated
  using (created_by = auth.uid());

-- ------------------------------------------------------------
-- league_members: User sieht Mitglieder *seiner* Ligen
-- ------------------------------------------------------------
create policy "members readable by same-league members"
  on public.league_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.league_members lm2
      where lm2.league_id = league_members.league_id
        and lm2.user_id = auth.uid()
    )
  );

-- User kann sich selbst einer Liga hinzufügen (per Invite-Code in App-Logik geprüft)
create policy "members self-insert"
  on public.league_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "members self-delete"
  on public.league_members for delete
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- matches: für alle eingeloggten lesbar, keine Writes vom Client
-- (Einspielen passiert via Service-Role / Edge Function)
-- ------------------------------------------------------------
create policy "matches readable by authenticated"
  on public.matches for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- tips: User sieht eigene Tipps immer;
-- fremde Tipps nur nach Kickoff und nur von Liga-Mitgliedern
-- ------------------------------------------------------------
create policy "tips readable own always"
  on public.tips for select
  to authenticated
  using (user_id = auth.uid());

create policy "tips readable of leaguemates after kickoff"
  on public.tips for select
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = tips.match_id and m.kickoff_at <= now()
    )
    and exists (
      select 1
      from public.league_members lm1
      join public.league_members lm2 on lm1.league_id = lm2.league_id
      where lm1.user_id = auth.uid() and lm2.user_id = tips.user_id
    )
  );

create policy "tips insert own before kickoff"
  on public.tips for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id and m.kickoff_at > now()
    )
  );

create policy "tips update own before kickoff"
  on public.tips for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id and m.kickoff_at > now()
    )
  );

-- ------------------------------------------------------------
-- scored_tips: lesbar für eigene + Liga-Mitglieder, kein Client-Write
-- ------------------------------------------------------------
create policy "scored_tips readable own"
  on public.scored_tips for select
  to authenticated
  using (user_id = auth.uid());

create policy "scored_tips readable of leaguemates"
  on public.scored_tips for select
  to authenticated
  using (
    exists (
      select 1
      from public.league_members lm1
      join public.league_members lm2 on lm1.league_id = lm2.league_id
      where lm1.user_id = auth.uid() and lm2.user_id = scored_tips.user_id
    )
  );
