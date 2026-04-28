-- Bolzify — Postfach (Schema, Teil 1/3)
--
-- Drei neue Tabellen:
--   app_admins   — wer darf App-weite Broadcasts senden (= du als Owner)
--   broadcasts   — vom App-Owner verfasste Nachrichten an ALLE User
--   inbox_items  — pro Empfänger ein Eintrag, denormalisiert (body + sender
--                  + league_name als Snapshot). Zwei Quellen:
--                    1) league_announcements (per Trigger fan-out)
--                    2) broadcasts (per Trigger fan-out)
--                  Snapshot-Felder, damit gelöschte Quellen das Postfach
--                  nicht zerschießen.
--
-- delete_own_account-Erweiterung kommt in 0014c.

-- ============================================================================
-- app_admins — Owner-Liste
-- ============================================================================
create table if not exists public.app_admins (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  role      text not null default 'owner' check (role in ('owner')),
  added_at  timestamptz not null default now()
);

-- Helper: Ist dieser User App-Admin? Security definer → bypasst RLS.
create or replace function public.is_app_admin(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from app_admins where user_id = p_user);
$$;

grant execute on function public.is_app_admin(uuid) to authenticated;

-- ============================================================================
-- broadcasts — App-weite Nachrichten
-- ============================================================================
create table if not exists public.broadcasts (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete set null,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists broadcasts_created_idx
  on public.broadcasts(created_at desc);

-- ============================================================================
-- inbox_items — denormalisierte Empfänger-Sicht
-- ============================================================================
create table if not exists public.inbox_items (
  id                       uuid primary key default gen_random_uuid(),
  recipient_id             uuid not null references public.profiles(id) on delete cascade,
  kind                     text not null check (kind in ('league_announcement', 'broadcast')),
  -- Quell-IDs (eine ist gesetzt, die andere null je nach kind)
  league_announcement_id   uuid references public.league_announcements(id) on delete set null,
  broadcast_id             uuid references public.broadcasts(id) on delete set null,
  -- Kontext-Snapshots: bleiben erhalten, auch wenn Quelle gelöscht wird.
  league_id                uuid references public.leagues(id) on delete set null,
  league_name_snapshot     text,
  sender_id                uuid references public.profiles(id) on delete set null,
  sender_username_snapshot text,
  body                     text not null,
  created_at               timestamptz not null default now(),
  read_at                  timestamptz,
  -- Sanity: kind passt zur Quell-ID
  check (
    (kind = 'league_announcement' and league_announcement_id is not null)
    or (kind = 'broadcast' and broadcast_id is not null)
  )
);
create index if not exists inbox_items_recipient_idx
  on public.inbox_items(recipient_id, created_at desc);
create index if not exists inbox_items_unread_idx
  on public.inbox_items(recipient_id)
  where read_at is null;
