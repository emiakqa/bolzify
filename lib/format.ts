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

// "gerade eben" / "vor 5 Min" / "vor 3 Std" / "gestern" / "12. Mai".
// Für Liga-Ankündigungen: kurze, lesbare Relativzeit ohne externe lib.
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 30) return 'gerade eben';
  if (diffSec < 60) return `vor ${diffSec} Sek`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `vor ${diffHr} Std`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'gestern';
  if (diffDay < 7) return `vor ${diffDay} Tagen`;

  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  });
}
