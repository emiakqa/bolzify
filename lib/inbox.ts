// Postfach-Helpers: Inbox-Items laden, ungelesene zählen, als gelesen markieren.

import { supabase } from './supabase';

export type InboxItem = {
  id: string;
  kind: 'league_announcement' | 'broadcast';
  league_id: string | null;
  league_name_snapshot: string | null;
  sender_id: string | null;
  sender_username_snapshot: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
};

export async function loadInbox(userId: string, limit = 100): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from('inbox_items')
    .select(
      'id, kind, league_id, league_name_snapshot, sender_id, sender_username_snapshot, body, created_at, read_at',
    )
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    // Tabelle möglicherweise noch nicht migriert (0014a fehlt) — leise leer.
    console.info('inbox load skipped:', error.message);
    return [];
  }
  return (data ?? []) as InboxItem[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('inbox_items')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

export async function markRead(itemId: string): Promise<void> {
  await supabase
    .from('inbox_items')
    .update({ read_at: new Date().toISOString() })
    .eq('id', itemId)
    .is('read_at', null);
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from('inbox_items')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);
}

export async function deleteItem(itemId: string): Promise<void> {
  await supabase.from('inbox_items').delete().eq('id', itemId);
}

export async function isAppAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function sendBroadcast(senderId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('broadcasts')
    .insert({ sender_id: senderId, body });
  if (error) throw new Error(error.message);
}
