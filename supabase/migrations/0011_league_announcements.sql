-- Bolzify — Liga-Ankündigungen (Spielleiter-Nachrichten)
--
-- Der Liga-Ersteller (admin = leagues.created_by) postet kurze Nachrichten
-- an alle Mitglieder. Nur Lesen (alle Member) und Schreiben/Löschen (admin).
--
-- Body bewusst auf 1000 Zeichen begrenzt — kein Editor, nur kurze Ansagen.

create table if not exists public.league_announcements (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists league_announcements_league_idx
  on public.league_announcements(league_id, created_at desc);

-- updated_at automatisch pflegen
create or replace function public.touch_league_announcements()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_league_announcements on public.league_announcements;
create trigger trg_touch_league_announcements
  before update on public.league_announcements
  for each row execute function public.touch_league_announcements();

-- ============================================================================
-- Admin-Check via security-definer Helper (analog is_league_member aus 0003).
-- Verhindert, dass die RLS-Policies leagues direkt referenzieren — die
-- leagues-SELECT-Policy benutzt selbst is_league_member, ein Self-Join
-- aus league_announcements via leagues würde bei manchen Queries rekursiv
-- evaluieren.
-- ============================================================================
create or replace function public.is_league_admin(p_league uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from leagues
    where id = p_league and created_by = p_user
  );
$$;

grant execute on function public.is_league_admin(uuid, uuid) to authenticated;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.league_announcements enable row level security;

-- Lesen: alle Mitglieder der Liga
drop policy if exists "announcements readable by members" on public.league_announcements;
create policy "announcements readable by members"
  on public.league_announcements for select to authenticated
  using (public.is_league_member(league_id, auth.uid()));

-- Insert nur durch Liga-Admin, author_id muss = auth.uid() sein
drop policy if exists "announcements insertable by admin" on public.league_announcements;
create policy "announcements insertable by admin"
  on public.league_announcements for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_league_admin(league_id, auth.uid())
  );

-- Update nur durch Admin (z.B. Tippfehler korrigieren)
drop policy if exists "announcements updatable by admin" on public.league_announcements;
create policy "announcements updatable by admin"
  on public.league_announcements for update to authenticated
  using (public.is_league_admin(league_id, auth.uid()))
  with check (public.is_league_admin(league_id, auth.uid()));

-- Delete nur durch Admin
drop policy if exists "announcements deletable by admin" on public.league_announcements;
create policy "announcements deletable by admin"
  on public.league_announcements for delete to authenticated
  using (public.is_league_admin(league_id, auth.uid()));
