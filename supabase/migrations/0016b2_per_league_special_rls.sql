-- Bolzify — Per-Liga-Tipps (Phase 2b: RLS für Sondertipps)
-- Voraussetzung: 0016a + 0016b wurden ausgeführt.
--
-- Eigene File wegen 200-Zeilen-Limit. Pattern identisch zu 0016b für tips:
-- Mitgliedschafts-Check für Insert/Update, Liga-Filter für Read-after-Deadline.

-- ============================================================================
-- special_tips
-- ============================================================================
drop policy if exists "special_tips self read" on public.special_tips;
drop policy if exists "special_tips public after deadline" on public.special_tips;
drop policy if exists "special_tips self insert" on public.special_tips;
drop policy if exists "special_tips self update" on public.special_tips;
drop policy if exists "special_tips self delete" on public.special_tips;

create policy "special_tips self read"
  on public.special_tips for select to authenticated
  using (user_id = auth.uid());

create policy "special_tips readable in same league after deadline"
  on public.special_tips for select to authenticated
  using (
    public.special_tips_deadline(tournament) is not null
    and public.special_tips_deadline(tournament) <= now()
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = special_tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "special_tips self insert in own league before deadline"
  on public.special_tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = special_tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "special_tips self update in own league before deadline"
  on public.special_tips for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = special_tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "special_tips self delete"
  on public.special_tips for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- group_winner_tips — analog
-- ============================================================================
drop policy if exists "group_winner_tips self read" on public.group_winner_tips;
drop policy if exists "group_winner_tips public after deadline" on public.group_winner_tips;
drop policy if exists "group_winner_tips self insert" on public.group_winner_tips;
drop policy if exists "group_winner_tips self update" on public.group_winner_tips;
drop policy if exists "group_winner_tips self delete" on public.group_winner_tips;

create policy "group_winner_tips self read"
  on public.group_winner_tips for select to authenticated
  using (user_id = auth.uid());

create policy "group_winner_tips readable in same league after deadline"
  on public.group_winner_tips for select to authenticated
  using (
    public.special_tips_deadline(tournament) is not null
    and public.special_tips_deadline(tournament) <= now()
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = group_winner_tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "group_winner_tips self insert in own league before deadline"
  on public.group_winner_tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = group_winner_tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "group_winner_tips self update in own league before deadline"
  on public.group_winner_tips for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      public.special_tips_deadline(tournament) is null
      or public.special_tips_deadline(tournament) > now()
    )
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = group_winner_tips.league_id and lm.user_id = auth.uid()
    )
  );

create policy "group_winner_tips self delete"
  on public.group_winner_tips for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- scored_special_tips
-- ============================================================================
drop policy if exists "scored_special_tips self read" on public.scored_special_tips;
drop policy if exists "scored_special_tips public after deadline" on public.scored_special_tips;

create policy "scored_special_tips self read"
  on public.scored_special_tips for select to authenticated
  using (user_id = auth.uid());

create policy "scored_special_tips readable in same league after deadline"
  on public.scored_special_tips for select to authenticated
  using (
    public.special_tips_deadline(tournament) is not null
    and public.special_tips_deadline(tournament) <= now()
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = scored_special_tips.league_id and lm.user_id = auth.uid()
    )
  );
