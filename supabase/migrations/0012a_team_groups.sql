-- Bolzify — Bugfix: teams.group_letter
--
-- Hintergrund: Der Sondertipp-Screen "Gruppensieger" (0010) ging davon aus,
-- dass matches.stage Werte wie 'Group A' enthält. api-football liefert für
-- WM-Fixtures aber 'Group Stage - 1' (Spieltag-Nummer) im league.round Feld.
-- Die Gruppe steht dort NIRGENDS — sie kommt nur aus /standings.
--
-- Fix: Wir speichern das group_letter direkt am Team. Robust gegen den
-- Stage-Format-Wildwuchs verschiedener Turniere und unabhängig von matches.

alter table public.teams
  add column if not exists group_letter text
  check (group_letter ~ '^[A-L]$');

create index if not exists teams_group_idx
  on public.teams(tournament, group_letter)
  where group_letter is not null;
