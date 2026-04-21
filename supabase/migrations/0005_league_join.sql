-- Join-Liga per Invite-Code.
-- Problem: Die leagues-select-Policy setzt Membership voraus — ein Nicht-Mitglied
-- kann die Liga per Code also nicht nachschlagen. Wir lösen das per
-- security-definer RPC, die den Lookup + Insert atomar macht.

create or replace function public.join_league_by_code(p_code text)
returns table (league_id uuid, league_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_league_name text;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select id, name into v_league_id, v_league_name
  from public.leagues
  where invite_code = upper(p_code);

  if v_league_id is null then
    raise exception 'code not found' using errcode = 'P0002';
  end if;

  -- Idempotent: wenn schon Mitglied, nichts tun, aber Liga zurückgeben.
  insert into public.league_members (league_id, user_id)
  values (v_league_id, v_user)
  on conflict do nothing;

  return query select v_league_id, v_league_name;
end;
$$;

grant execute on function public.join_league_by_code(text) to authenticated;
