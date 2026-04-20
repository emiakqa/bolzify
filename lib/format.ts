// Formatierungs-Helfer für Bolzify-UI.

export function formatKickoffDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function formatKickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "in 3 Tagen, 5 Std" / "in 42 Min" / "läuft" / "beendet".
export function formatCountdown(iso: string, now: number = Date.now()): string {
  const target = new Date(iso).getTime();
  const diffMs = target - now;

  if (diffMs <= -3 * 60 * 60 * 1000) return 'beendet';
  if (diffMs <= 0) return 'läuft';

  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;

  if (days >= 1) return `in ${days}d ${hours}h`;
  if (hours >= 1) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

// Grob-Zustand: ist Anpfiff schon?
export function isBeforeKickoff(iso: string, now: number = Date.now()): boolean {
  return new Date(iso).getTime() > now;
}
