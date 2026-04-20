-- Bolzify — RLS-Anpassung: Dev-Tournaments jederzeit tippbar
--
-- Problem: Die Policies "tips insert/update own before kickoff" sperren
-- jedes Match nach Anpfiff. Für WM-2022-Dev-Daten (alle bereits gespielt)
-- bedeutet das: Tipp-Flow nicht testbar.
--
-- Lösung: Zeitsperre gilt nur noch für das produktive Turnier 'WM2026'.
-- Alle anderen Tournaments (WM2022, spätere Test-Runs) sind jederzeit tippbar.
-- Vor Launch sollte höchstens der Wert von 'WM2026' angepasst werden — die
-- Logik selbst ist produktions-safe.

drop policy if exists "tips insert own before kickoff" on public.tips;
drop policy if exists "tips update own before kickoff" on public.tips;

create policy "tips insert own before kickoff"
  on public.tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id
        and (m.tournament <> 'WM2026' or m.kickoff_at > now())
    )
  );

create policy "tips update own before kickoff"
  on public.tips for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = tips.match_id
        and (m.tournament <> 'WM2026' or m.kickoff_at > now())
    )
  );
