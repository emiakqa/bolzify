-- Bolzify — Postfach (Trigger + delete_own_account, Teil 3/3)
-- Voraussetzung: 0014a + 0014b wurden ausgeführt.

-- ============================================================================
-- Trigger 1: league_announcements → fan-out an alle Mitglieder
-- (inkl. Author selbst — wie bei jeder Chat-App)
-- ============================================================================
create or replace function public.trigger_fanout_league_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_name text;
  v_sender_username text;
begin
  select name into v_league_name from public.leagues where id = new.league_id;
  select username into v_sender_username from public.profiles where id = new.author_id;

  insert into public.inbox_items (
    recipient_id, kind,
    league_announcement_id, league_id,
    league_name_snapshot,
    sender_id, sender_username_snapshot,
    body
  )
  select
    lm.user_id, 'league_announcement',
    new.id, new.league_id,
    v_league_name,
    new.author_id, v_sender_username,
    new.body
  from public.league_members lm
  where lm.league_id = new.league_id;

  return new;
end;
$$;

drop trigger if exists league_announcements_fanout on public.league_announcements;
create trigger league_announcements_fanout
  after insert on public.league_announcements
  for each row execute function public.trigger_fanout_league_announcement();

-- ============================================================================
-- Trigger 2: broadcasts → fan-out an ALLE Profile
-- ============================================================================
create or replace function public.trigger_fanout_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_username text;
begin
  select username into v_sender_username from public.profiles where id = new.sender_id;

  insert into public.inbox_items (
    recipient_id, kind,
    broadcast_id,
    sender_id, sender_username_snapshot,
    body
  )
  select
    p.id, 'broadcast',
    new.id,
    new.sender_id, v_sender_username,
    new.body
  from public.profiles p;

  return new;
end;
$$;

drop trigger if exists broadcasts_fanout on public.broadcasts;
create trigger broadcasts_fanout
  after insert on public.broadcasts
  for each row execute function public.trigger_fanout_broadcast();

-- ============================================================================
-- delete_own_account — inbox_items + broadcasts mitlöschen
-- (broadcasts.sender_id ist ON DELETE SET NULL, also bleiben sie technisch
-- erhalten. Wenn der Account aber komplett weg soll, müssen auch eigene
-- Broadcasts mit. Das macht aber nur Sinn wenn der Owner sich selbst löscht
-- — was du eher nicht tun wirst. Trotzdem belt-and-suspenders.)
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

  delete from public.inbox_items where recipient_id = v_user;
  delete from public.broadcasts where sender_id = v_user;
  delete from public.scored_special_tips where user_id = v_user;
  delete from public.group_winner_tips where user_id = v_user;
  delete from public.special_tips where user_id = v_user;
  delete from public.scored_tips where user_id = v_user;
  delete from public.tips where user_id = v_user;
  delete from public.league_announcements where author_id = v_user;
  delete from public.league_members where user_id = v_user;
  delete from public.leagues where created_by = v_user;
  delete from public.app_admins where user_id = v_user;

  delete from public.profiles where id = v_user;

  delete from auth.users where id = v_user;
end;
$$;
