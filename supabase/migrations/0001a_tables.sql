-- Bolzify — Teil 1/2: Tabellen + Trigger (Woche 1, Tag 2)

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null check (char_length(username) between 3 and 20),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

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

create table public.leagues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 40),
  invite_code   text unique not null,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  tournament    text not null default 'WM2026',
  created_at    timestamptz not null default now()
);
create index leagues_created_by_idx on public.leagues(created_by);
create index leagues_invite_code_idx on public.leagues(invite_code);

create table public.league_members (
  league_id   uuid not null references public.leagues(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_members_user_idx on public.league_members(user_id);

create table public.matches (
  id              bigint primary key,
  tournament      text not null default 'WM2026',
  kickoff_at      timestamptz not null,
  home_team       text not null,
  away_team       text not null,
  home_team_code  text,
  away_team_code  text,
  stage           text,
  status          text not null default 'scheduled',
  home_goals      int,
  away_goals      int,
  first_scorer    text,
  updated_at      timestamptz not null default now()
);
create index matches_kickoff_idx on public.matches(kickoff_at);
create index matches_status_idx on public.matches(status);

create table public.tips (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  match_id        bigint not null references public.matches(id) on delete cascade,
  home_goals      int not null check (home_goals >= 0 and home_goals <= 20),
  away_goals      int not null check (away_goals >= 0 and away_goals <= 20),
  first_scorer    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, match_id)
);
create index tips_match_idx on public.tips(match_id);
create index tips_user_idx on public.tips(user_id);

create table public.scored_tips (
  tip_id          uuid primary key references public.tips(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  match_id        bigint not null references public.matches(id) on delete cascade,
  points          int not null default 0,
  scorer_bonus    int not null default 0,
  total_points    int generated always as (points + scorer_bonus) stored,
  scored_at       timestamptz not null default now()
);
create index scored_tips_user_idx on public.scored_tips(user_id);
create index scored_tips_match_idx on public.scored_tips(match_id);
