-- Bolzify — Per-Liga-Tipps (Phase 2: RLS)
-- Voraussetzung: 0016a wurde ausgeführt.
--
-- Pro Tabelle die bestehenden Policies droppen und neu erstellen, mit
-- League-Membership-Check. Insert/Update braucht jetzt: User ist Mitglied
-- in der Ziel-Liga. Select-on-leaguemates filtert auch nach exakt dieser
-- Liga (vorher: globaler Liga-Mate-Check über alle gemeinsamen Ligen).

-- ============================================================================
-- tips
-- ============================================================================
drop policy if exists "tips readable own always" on public.tips;
drop policy if exists "tips readable of leaguemates after kickoff" on public.tips;
drop policy if exists "tips insert own before kickoff" on public.tips;
drop policy if exists "tips update own before kickoff" on public.tips;

create policy "tips self read"
  on public.tips for select to authenticated
  using (user_id = auth.uid());

create policy "tips readable in same league after kickoff"
  on public.tips for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = tips.match_id and m.kickoff_at <= now()
    )
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "tips insert own before kickoff in own league"
  on public.tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id and m.kickoff_at > now()
    )
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "tips update own before kickoff in own league"
  on public.tips for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id and m.kickoff_at > now()
    )
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = tips.league_id and lm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- scored_tips
-- ============================================================================
drop policy if exists "scored_tips readable own" on public.scored_tips;
drop policy if exists "scored_tips readable of leaguemates" on public.scored_tips;

create policy "scored_tips self read"
  on public.scored_tips for select to authenticated
  using (user_id = auth.uid());

create policy "scored_tips readable in same league"
  on public.scored_tips for select to authenticated
  using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = scored_tips.league_id and lm.user_id = auth.uid()
    )
  );

-- Kein Insert/Update via Client — nur Function (security definer).
