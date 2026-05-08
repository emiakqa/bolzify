// Username-Filter für /set-username — verhindert offensichtliche Hate-Speech-,
// NS- und Slur-Begriffe in öffentlich sichtbaren Usernames.
//
// Hintergrund: Usernames erscheinen in Liga-Tabellen, Hero-Footer („Leader: @X"),
// Sondertipp-Karten. Wir tragen Mit-Verantwortung für UGC und müssen App-Store-
// Reviews bestehen — bewusst-aggressive Namen riskieren Ablehnung und sind
// unfair gegenüber anderen Spielern.
//
// Strategie:
// 1. Lowercase + Underscores entfernen (Underscore-Verschleierung killt: "h_itler")
// 2. Zwei Pässe gegen die Blacklist:
//    - Roh-Pass: fängt zahlenbasierte Codes wie "1488"
//    - Leetspeak-Pass: 0→o, 1→i, 3→e usw. fängt "h1tler", "n1gger" etc.
// 3. Substring-Match — Blacklist enthält nur Begriffe ohne legitime
//    Substring-Treffer in normalen Usernames (z. B. NICHT "ass" → wäre False-
//    Positive für "passwort" wenn ein Username so etwas enthielte).
//
// Bewusst NICHT abgedeckt:
// - Dogwhistle-Zahlen alleine (88, 14, 18) — zu False-Positive-anfällig
//   (Geburtsjahre, Trikotnummern). Reporting-Flow ist die richtige Antwort.
// - Sehr kreative Verschleierung mit Zero-Width-Chars o. ä. — Username-Regex
//   lässt nur [a-zA-Z0-9_] zu, das filtert die meisten Tricks schon raus.
//
// Server-Backup: Idealerweise als Postgres-Trigger auf profiles, aber für v0.26
// ist clientseitige Validierung ausreichend (Bypass via API würde voraussetzen,
// dass jemand die App debuggt — niedriges Risiko in der Beta-Phase).

const BLACKLIST = [
  // NS / Drittes Reich
  'hitler',
  'adolf',
  'nazi',
  'naziboy',
  'naziboi',
  'sieghei', // "sieg heil" → ohne Space
  'heilhitler',
  'hakenkreuz',
  'swastika',
  'meinkampf',
  'drittesreich',
  'judenraus',
  'judensau',
  'rassenrein',
  'reichsbuerger',
  '1488',
  '14worte',
  '14words',
  'wehrmacht', // grenzwertig, aber als Username sehr aufgeladen
  'gestapo',
  'kkk',

  // Slurs (DE)
  'kanake',
  'kanaken',
  'neger',
  'negerlein',
  'zigeuner',

  // Slurs (EN)
  'nigger',
  'nigga',
  'niglet',
  'faggot',
  'retard',
  'tranny',
  'chink',

  // Sexueller Missbrauch / Ausbeutung
  'pedo',
  'paedo',
  'pedophile',
  'kinderfick',

  // Terrorismus
  'isis',
  'jihadi',
  'taliban',

  // Allgemeine Beleidigungen mit hoher Sicherheit (kein legitimer Substring)
  'hurensohn',
  'hurensohne',
  'arschloch',
];

/**
 * Normalisiert einen Username für Blacklist-Vergleich:
 * - lowercase
 * - Underscores entfernt
 */
function lower(s: string): string {
  return s.toLowerCase().replace(/_/g, '');
}

/**
 * Leetspeak-Normalisierung: ersetzt typische Zahl-für-Buchstabe-Substitutionen.
 * Damit fangen wir „h1tler", „n1gger", „4dolf" etc.
 *
 * Achtung: diese Funktion verändert auch unverdächtige Zahlen (z. B. „lisa1234"
 * → „lisaieea") — das ist OK, weil die Blacklist keine kurzen Buchstabenfolgen
 * enthält, die so zufällig matchen würden.
 */
function leetspeak(s: string): string {
  return s
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g');
}

/**
 * Prüft, ob ein Username gegen den Blacklist-Filter verstößt.
 * Gibt `null` zurück, wenn der Username sauber ist, sonst eine
 * (vage formulierte) Fehlermeldung. Wir geben den Match-Begriff bewusst
 * NICHT zurück — sonst hat der Angreifer einen Roadmap zur Umgehung.
 */
export function checkUsername(raw: string): string | null {
  if (!raw) return null;
  const lo = lower(raw);
  const normalized = leetspeak(lo);
  for (const bad of BLACKLIST) {
    if (lo.includes(bad) || normalized.includes(bad)) {
      return 'Dieser Username ist nicht erlaubt — bitte einen anderen wählen.';
    }
  }
  return null;
}
