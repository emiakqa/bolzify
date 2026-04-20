-- Bolzify — Teil 2/2: Row Level Security (Woche 1, Tag 2)

alter table public.profiles        enable row level security;
alter table public.leagues         enable row level security;
alter table public.league_members  enable row level security;
alter table public.matches         enable row level security;
alter table public.tips            enable row level security;
alter table public.scored_tips     enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles updatable by owner"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "leagues readable by members"
  on public.leagues for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.league_members
      where league_id = leagues.id and user_id = auth.uid()
    )
  );

create policy "leagues insertable by authenticated"
  on public.leagues for insert to authenticated
  with check (created_by = auth.uid());

create policy "leagues updatable by creator"
  on public.leagues for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "leagues deletable by creator"
  on public.leagues for delete to authenticated
  using (created_by = auth.uid());

create policy "members readable by same-league members"
  on public.league_members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.league_members lm2
      where lm2.league_id = league_members.league_id
        and lm2.user_id = auth.uid()
    )
  );

create policy "members self-insert"
  on public.league_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "members self-delete"
  on public.league_members for delete to authenticated
  using (user_id = auth.uid());

create policy "matches readable by authenticated"
  on public.matches for select to authenticated using (true);

create policy "tips readable own always"
  on public.tips for select to authenticated
  using (user_id = auth.uid());

create policy "tips readable of leaguemates after kickoff"
  on public.tips for select to authenticated
  using (
    exists (
      select 1 from public.matches m
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
  on public.tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id and m.kickoff_at > now()
    )
  );

create policy "tips update own before kickoff"
  on public.tips for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id and m.kickoff_at > now()
    )
  );

create policy "scored_tips readable own"
  on public.scored_tips for select to authenticated
  using (user_id = auth.uid());

create policy "scored_tips readable of leaguemates"
  on public.scored_tips for select to authenticated
  using (
    exists (
      select 1
      from public.league_members lm1
      join public.league_members lm2 on lm1.league_id = lm2.league_id
      where lm1.user_id = auth.uid() and lm2.user_id = scored_tips.user_id
    )
  );
