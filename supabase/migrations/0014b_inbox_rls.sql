-- Bolzify — Postfach (RLS, Teil 2/3)
-- Voraussetzung: 0014a wurde ausgeführt.

-- ============================================================================
-- app_admins
-- ============================================================================
alter table public.app_admins enable row level security;

-- Lesen: jeder authentifizierte User darf prüfen, wer Admin ist (nötig für
-- den UI-Check "Bin ich Admin?"). Schreiben/Löschen NUR via service-role im
-- SQL-Editor — keine RLS-Policies dafür → blockt Client-Insert.
drop policy if exists "app_admins readable" on public.app_admins;
create policy "app_admins readable"
  on public.app_admins for select to authenticated using (true);

-- ============================================================================
-- broadcasts
-- ============================================================================
alter table public.broadcasts enable row level security;

-- Lesen: nur App-Admins (Audit-Trail / History im Composer). Andere User
-- sehen Broadcasts ausschließlich via inbox_items.
drop policy if exists "broadcasts readable by admin" on public.broadcasts;
create policy "broadcasts readable by admin"
  on public.broadcasts for select to authenticated
  using (public.is_app_admin(auth.uid()));

-- Insert nur App-Admin, sender_id muss = auth.uid()
drop policy if exists "broadcasts insertable by admin" on public.broadcasts;
create policy "broadcasts insertable by admin"
  on public.broadcasts for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_app_admin(auth.uid())
  );

-- Delete nur App-Admin (zum Aufräumen falscher Posts)
drop policy if exists "broadcasts deletable by admin" on public.broadcasts;
create policy "broadcasts deletable by admin"
  on public.broadcasts for delete to authenticated
  using (public.is_app_admin(auth.uid()));

-- ============================================================================
-- inbox_items
-- ============================================================================
alter table public.inbox_items enable row level security;

-- Lesen: nur eigene Items
drop policy if exists "inbox_items self read" on public.inbox_items;
create policy "inbox_items self read"
  on public.inbox_items for select to authenticated
  using (recipient_id = auth.uid());

-- Update: nur eigene Items, und nur read_at darf gesetzt werden — wir können
-- den Spalten-Constraint nicht via Policy erzwingen, aber der Client-Code
-- nutzt nur read_at-Updates. Alle anderen Felder bleiben unverändert weil
-- der Client sie nicht setzt.
drop policy if exists "inbox_items self update" on public.inbox_items;
create policy "inbox_items self update"
  on public.inbox_items for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Delete: User darf eigenes Item entfernen ("aus Postfach löschen")
drop policy if exists "inbox_items self delete" on public.inbox_items;
create policy "inbox_items self delete"
  on public.inbox_items for delete to authenticated
  using (recipient_id = auth.uid());

-- KEIN Insert via Client — geht nur via Trigger (security definer).
