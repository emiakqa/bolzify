// Bolzify — Lokale Scheduled-Reminders (1h vor Kickoff, nur untippte Matches).
//
// Rein lokal, keine Push-Tokens, kein Server. Funktioniert in Expo Go
// (für iOS-Remote-Pushs wäre EAS Dev-Build nötig — für Kickoff-Reminder
// reichen lokal geplante Notifications völlig).
//
// Flow:
// - Beim App-Start / nach Foreground: syncReminders(userId) plant alle neu
// - Nach Tipp-Save: cancelReminder(matchId) entfernt den jeweiligen
// - IDs werden in AsyncStorage gemappt matchId → notificationId, damit
//   wir idempotent cancel können

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

const STORAGE_KEY = 'bolzify.reminders.v1'; // JSON: { [matchId]: notificationId }
const ENABLED_KEY = 'bolzify.reminders.enabled.v1'; // '1' (default) oder '0'
const LEAD_KEY = 'bolzify.reminders.lead.v1'; // '60' (default) oder '30' Minuten
const SPECIAL_REMINDER_KEY = 'bolzify.special-reminder.id.v1'; // notificationId
const MAX_SCHEDULE = 48; // iOS-Limit: 64 pending — wir lassen 16 frei für Sondertipp-Reminder + Score-Ankündigungen
const SPECIAL_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000; // 24h vor erstem Spiel
const LIVE_TOURNAMENT = 'WM2026';

export type ReminderLeadMin = 30 | 60;

export async function getReminderLeadMin(): Promise<ReminderLeadMin> {
  const v = await AsyncStorage.getItem(LEAD_KEY);
  return v === '30' ? 30 : 60;
}

export async function setReminderLeadMin(lead: ReminderLeadMin): Promise<void> {
  await AsyncStorage.setItem(LEAD_KEY, String(lead));
}

// User-Toggle aus dem Settings-Screen. Default an.
export async function getRemindersEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ENABLED_KEY);
  return v !== '0';
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
}

type ReminderMap = Record<string, string>;

// App-weit einmal — zeigt Notifications auch im Vordergrund.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Liefert die Route, zu der eine Notification beim Tap navigieren soll.
 * Wird vom _layout-Handler aufgerufen.
 *
 * Returns null wenn die Notification keine zugehörige Route hat
 * (z.B. unbekannter `kind`).
 */
export function notificationToRoute(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;
  const kind = data.kind;
  if (kind === 'tip-reminder' && (typeof data.matchId === 'number' || typeof data.matchId === 'string')) {
    return `/tip/${data.matchId}`;
  }
  if (kind === 'special-tip-reminder') {
    return '/special-tips';
  }
  return null;
}

async function loadMap(): Promise<ReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveMap(map: ReminderMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// Android braucht einen Channel, sonst kommt nichts an.
export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tip-reminders', {
      name: 'Tipp-Erinnerungen',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#66BB6A',
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  if (status === 'denied') return false; // User hat aktiv abgelehnt, nicht nochmal fragen
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

async function cancelById(id: string | undefined) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore — kann schon gefeuert haben oder nicht existieren
  }
}

// Nach einem Tipp: den spezifischen Reminder weg — restliche Matches bleiben.
export async function cancelReminder(matchId: number): Promise<void> {
  const map = await loadMap();
  const id = map[String(matchId)];
  if (id) {
    await cancelById(id);
    delete map[String(matchId)];
    await saveMap(map);
  }
}

type MatchRow = {
  id: number;
  kickoff_at: string;
  home_team: string;
  away_team: string;
};

// Plant Reminders für alle zukünftigen, untippten Matches neu.
// Idempotent: cancelt vorherigen State komplett und scheduled frisch — so müssen
// wir keine Diff-Logik schreiben (max ~50 Matches, einmal beim App-Start, billig).
export async function syncReminders(
  userId: string,
): Promise<{ scheduled: number; skipped: number; granted: boolean }> {
  // Wenn User in den Settings deaktiviert hat: alles weg und raus.
  const enabled = await getRemindersEnabled();
  if (!enabled) {
    await clearAllReminders();
    return { scheduled: 0, skipped: 0, granted: true };
  }

  const granted = await ensureNotificationSetup();
  if (!granted) return { scheduled: 0, skipped: 0, granted: false };

  // User-konfigurierte Lead-Zeit (60min default, 30min optional).
  const leadMin = await getReminderLeadMin();
  const leadMs = leadMin * 60 * 1000;
  const leadLabel = leadMin === 30 ? '30 Minuten' : '1 Stunde';

  // Alten Match-State wegwerfen
  const oldMap = await loadMap();
  await Promise.all(Object.values(oldMap).map(cancelById));
  await saveMap({});

  // Nur Matches holen, deren Kickoff > now + lead (sonst Trigger in Vergangenheit).
  const horizon = new Date(Date.now() + leadMs + 60_000).toISOString();
  const { data: matches } = await supabase
    .from('matches')
    .select('id, kickoff_at, home_team, away_team')
    .gt('kickoff_at', horizon)
    .eq('status', 'scheduled')
    .order('kickoff_at', { ascending: true })
    .limit(MAX_SCHEDULE);

  // Sondertipp-Reminder unabhängig vom Match-State neu scheduln.
  // Müssen vor dem Match-Loop laufen, weil sie ein eigenes Slot-Limit haben.
  await syncSpecialTipReminder(userId);

  if (!matches || matches.length === 0) {
    return { scheduled: 0, skipped: 0, granted: true };
  }

  // Liga-Mitgliedschaften des Users — Tipps sind seit 0016 pro Liga.
  // Ein Match gilt als "fully tipped" nur wenn der User in JEDER seiner
  // Ligen schon getippt hat. Sonst feuert der Reminder, damit er die
  // verbliebenen Ligen noch befüllen kann.
  const { data: memberRows } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', userId);
  const userLeagueCount = (memberRows ?? []).length;
  if (userLeagueCount === 0) {
    // Keine Liga = keine sinnvollen Tipps = keine Reminder.
    return { scheduled: 0, skipped: 0, granted: true };
  }

  const ids = matches.map((m) => m.id);
  const { data: tips } = await supabase
    .from('tips')
    .select('match_id, league_id')
    .eq('user_id', userId)
    .in('match_id', ids);

  const leaguesPerMatch = new Map<number, Set<string>>();
  for (const t of tips ?? []) {
    const set = leaguesPerMatch.get(t.match_id) ?? new Set<string>();
    set.add(t.league_id);
    leaguesPerMatch.set(t.match_id, set);
  }
  const tipped = new Set<number>();
  for (const [matchId, leagueSet] of leaguesPerMatch) {
    if (leagueSet.size >= userLeagueCount) tipped.add(matchId);
  }

  const newMap: ReminderMap = {};
  let scheduled = 0;
  let skipped = 0;

  for (const m of matches as MatchRow[]) {
    if (tipped.has(m.id)) {
      skipped++;
      continue;
    }
    const triggerAt = new Date(m.kickoff_at).getTime() - leadMs;
    if (triggerAt <= Date.now()) {
      skipped++;
      continue;
    }
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚽ ${m.home_team} vs ${m.away_team}`,
          body: `Anpfiff in ${leadLabel} — du hast noch keinen Tipp.`,
          data: { matchId: m.id, kind: 'tip-reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerAt),
          channelId: Platform.OS === 'android' ? 'tip-reminders' : undefined,
        },
      });
      newMap[String(m.id)] = id;
      scheduled++;
    } catch {
      skipped++;
    }
  }

  await saveMap(newMap);
  return { scheduled, skipped, granted: true };
}

// Plant einen einmaligen Reminder 24h vor dem ersten Spiel des Live-Turniers,
// falls der User noch keinen vollständigen Sondertipp abgegeben hat.
// Der Reminder ist idempotent: alter wird gecancelt, neuer geplant. Wenn der
// User schon getippt hat oder die Frist durch ist, wird gar keiner geplant.
async function syncSpecialTipReminder(userId: string): Promise<void> {
  // Alten Reminder weg — falls User getippt hat, falls Frist verschoben wurde.
  const oldId = await AsyncStorage.getItem(SPECIAL_REMINDER_KEY);
  if (oldId) {
    await cancelById(oldId);
    await AsyncStorage.removeItem(SPECIAL_REMINDER_KEY);
  }

  // Schon in irgendeiner Liga einen Sondertipp abgegeben? Dann kein Reminder
  // mehr — User kennt das Feature und kann via „Übernehmen" auf andere Ligen
  // ausweiten. Limit(1) statt maybeSingle weil per-Liga jetzt n Rows möglich.
  const { data: existing } = await supabase
    .from('special_tips')
    .select('user_id')
    .eq('user_id', userId)
    .eq('tournament', LIVE_TOURNAMENT)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Wann startet das Turnier? = frühestes Match.
  const { data: firstMatch } = await supabase
    .from('matches')
    .select('kickoff_at')
    .eq('tournament', LIVE_TOURNAMENT)
    .order('kickoff_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!firstMatch?.kickoff_at) return;

  const triggerAt = new Date(firstMatch.kickoff_at).getTime() - SPECIAL_REMINDER_LEAD_MS;
  if (triggerAt <= Date.now()) return; // zu spät — Frist quasi durch

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌟 WM startet morgen — Sondertipps abgeben',
        body: 'Weltmeister, Torschützenkönig, Gruppensieger — bis zu 76 Bonuspunkte.',
        data: { kind: 'special-tip-reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerAt),
        channelId: Platform.OS === 'android' ? 'tip-reminders' : undefined,
      },
    });
    await AsyncStorage.setItem(SPECIAL_REMINDER_KEY, id);
  } catch {
    // ignore — kein harter Fail, ist nur ein Reminder
  }
}

/**
 * Wird vom Special-Tips-Screen nach erfolgreicher Abgabe aufgerufen, damit
 * der bereits geplante Reminder verschwindet und nicht morgens nervt.
 */
export async function cancelSpecialTipReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(SPECIAL_REMINDER_KEY);
  if (id) {
    await cancelById(id);
    await AsyncStorage.removeItem(SPECIAL_REMINDER_KEY);
  }
}

// Logout / Account-Wechsel: alles weg — inkl. Sondertipp-Reminder.
export async function clearAllReminders(): Promise<void> {
  const map = await loadMap();
  await Promise.all(Object.values(map).map(cancelById));
  await saveMap({});
  await cancelSpecialTipReminder();
}
