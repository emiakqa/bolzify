-- Bolzify — RLS-Rekursions-Fix
--
-- Problem: "infinite recursion detected in policy for relation league_members"
-- beim Tipp-Upsert. Ursache: die SELECT-Policy auf league_members referenziert
-- sich selbst in ihrer using-Klausel. Sobald irgendeine Query league_members
-- touched (z.B. der Returning-Row nach tips-Insert, der via tips-SELECT-Policy
-- auf league_members joint), fällt Postgres in Endlosschleife.
--
-- Lösung: Helper-Funktion mit `security definer`, die RLS im Funktions-Body
-- umgeht. Die SELECT-Policy auf league_members ruft nur noch diese Funktion —
-- kein direktes Self-Query mehr.

-- Helper: bypassed RLS weil security definer als Table-Owner läuft.
-- search_path gesetzt um Hijacking zu vermeiden.
create or replace function public.is_league_member(p_league uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from league_members
    where league_id = p_league and user_id = p_user
  );
$$;

grant execute on function public.is_league_member(uuid, uuid) to authenticated;

-- Alte rekursive Policy wegwerfen
drop policy if exists "members readable by same-league members" on public.league_members;

-- Neu: der zweite OR-Zweig nutzt die Helper-Funktion statt Self-Query.
create policy "members readable by same-league members"
  on public.league_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_league_member(league_id, auth.uid())
  );
