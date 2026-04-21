-- Bolzify — Avatar Storage + Account-Löschung
--
-- 1) Storage-Bucket `avatars` für User-Profilbilder
-- 2) RLS-Policies: alle Authenticated lesen, User schreibt nur in sein Subfolder
-- 3) RPC `delete_own_account()` — User-initiierte Account-Löschung (DSGVO)

-- ============================================================================
-- 1) Bucket anlegen (idempotent)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ============================================================================
-- 2) Storage RLS
-- ============================================================================
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 3) Account-Löschung
-- Entfernt alle User-Daten + auth.users-Row. Cascades würden reichen,
-- aber expliziter Delete-Reihe ist robuster (z.B. falls später FKs wegfallen).
-- Selbst-erstellte Ligen sterben mit — das ist bewusst, weil created_by NOT NULL ist.
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

  -- Tipp-Daten + Ligen
  delete from public.scored_tips where user_id = v_user;
  delete from public.tips where user_id = v_user;
  delete from public.league_members where user_id = v_user;
  delete from public.leagues where created_by = v_user;

  -- Profil
  delete from public.profiles where id = v_user;

  -- Auth-User (Supabase cascaded Storage-Objekte nicht — Avatars bleiben, das ist ok)
  delete from auth.users where id = v_user;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
