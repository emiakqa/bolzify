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

const REMINDER_LEAD_MS = 60 * 60 * 1000; // 1h vor Kickoff
const STORAGE_KEY = 'bolzify.reminders.v1'; // JSON: { [matchId]: notificationId }
const MAX_SCHEDULE = 50; // iOS-Limit: 64 pending, Android: pragmatisch

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
// wir keine Diff-Logik schreiben (max 50 Matches, einmal beim App-Start, billig).
export async function syncReminders(
  userId: string,
): Promise<{ scheduled: number; skipped: number; granted: boolean }> {
  const granted = await ensureNotificationSetup();
  if (!granted) return { scheduled: 0, skipped: 0, granted: false };

  // Alten State wegwerfen
  const oldMap = await loadMap();
  await Promise.all(Object.values(oldMap).map(cancelById));
  await saveMap({});

  // Nur Matches holen, deren Kickoff > now + 1h (sonst Trigger in Vergangenheit).
  const horizon = new Date(Date.now() + REMINDER_LEAD_MS + 60_000).toISOString();
  const { data: matches } = await supabase
    .from('matches')
    .select('id, kickoff_at, home_team, away_team')
    .gt('kickoff_at', horizon)
    .eq('status', 'scheduled')
    .order('kickoff_at', { ascending: true })
    .limit(MAX_SCHEDULE);

  if (!matches || matches.length === 0) {
    return { scheduled: 0, skipped: 0, granted: true };
  }

  // Welche davon sind schon getippt?
  const ids = matches.map((m) => m.id);
  const { data: tips } = await supabase
    .from('tips')
    .select('match_id')
    .eq('user_id', userId)
    .in('match_id', ids);
  const tipped = new Set((tips ?? []).map((t) => t.match_id));

  const newMap: ReminderMap = {};
  let scheduled = 0;
  let skipped = 0;

  for (const m of matches as MatchRow[]) {
    if (tipped.has(m.id)) {
      skipped++;
      continue;
    }
    const triggerAt = new Date(m.kickoff_at).getTime() - REMINDER_LEAD_MS;
    if (triggerAt <= Date.now()) {
      skipped++;
      continue;
    }
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚽ ${m.home_team} vs ${m.away_team}`,
          body: 'Anpfiff in 1h — du hast noch keinen Tipp.',
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

// Logout / Account-Wechsel: alles weg.
export async function clearAllReminders(): Promise<void> {
  const map = await loadMap();
  await Promise.all(Object.values(map).map(cancelById));
  await saveMap({});
}
