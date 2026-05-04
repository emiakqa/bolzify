# Handoff: Bolzify App Redesign (Bolzplatz Direction)

## Overview

Bolzify ist eine Tipprunden-App (Bundesliga / WM / EM / private Ligen). Dieser Handoff enthält das **finale Hi-Fi Redesign** — visuelle Direction "**Bolzplatz**" — als HTML/React-Mockups. Ziel ist, den bestehenden v0.16-Stand (grün-getöntes Anthrazit, ui-rounded, Border-heavy Cards) durch eine wärmere, papierige Direction mit klarer typografischer Hierarchie und Tor-Orange als zweitem Akzent zu ersetzen.

Enthalten sind alle Hauptscreens (Light + Dark), Detail-Screens, ein Token-Sheet und ein A/B-Vergleich gegen v0.16.

## About the Design Files

Die Dateien in diesem Bundle sind **Design-Referenzen, gebaut in HTML + React (über Babel-Standalone)** — Prototypen, die die intendierte Optik und das Verhalten zeigen, **kein Production-Code zum 1:1-Kopieren**.

Die Aufgabe ist, diese HTML-Designs **in der bestehenden Codebase nachzubauen** (vermutlich React Native, da v0.16 in `design.ts` Tokens hat — gerne checken, ob das stimmt) — mit den bestehenden Patterns, der bestehenden Library und unter Beibehaltung der bestehenden Datenmodelle. Falls noch keine Codebase existiert, ist React Native (Expo) die plausibelste Wahl: die Primitives (`Card`, `Button`, `Badge`, `SectionLabel`, `FlagSquare`) sind bewusst so geschrieben, dass sie 1:1 nach RN portierbar sind (`div`→`View`, `span`→`Text`, gleiche Style-Keys).

Die Tokens in `bolzplatz/tokens.jsx` sind die **Source of Truth** für Farbe, Typo, Spacing, Radius und Shadow.

## Fidelity

**High-fidelity (hifi).** Pixel-genaue Mockups mit finalen Farben, Typografie, Spacing und Radien. Der Developer soll die UI pixelgetreu nachbauen, nicht "interpretieren". Tipps an der Kante (z.B. Match-Card-Layout, Score-as-Hero, Pill-Buttons) sind bewusste Design-Entscheidungen — bitte nicht "vereinfachen".

Interaktionsdetails (Animations-Timings, Haptik, Loading-/Error-States) sind in den Mockups **nicht ausgespielt** und in der Sektion "Interactions & Behavior" stichpunktartig beschrieben — hier muss der Developer in Absprache mit Design die Lücken füllen.

---

## Design Tokens

**Source of Truth: `bolzplatz/tokens.jsx`** — übernimm Werte 1:1 nach `design.ts` (oder Äquivalent).

### Palette

```
green50   #E8F4EC    Bolzplatz-Grün (Brand-Akzent)
green100  #D1E9D8
green500  #22C55E    accent (Dark)
green600  #16A34A    accentHover (Light)
green700  #15803D    accent (Light)
green800  #0F4D2C

orange50  #FBE8DD    Tor-Orange (sek. Akzent: Sondertipps/Streaks/Live)
orange300 #F2A684
orange500 #E8744E
orange600 #C95A36

paper50   #FBF8F1    surfaceSunken (Light)
paper100  #F4F1EA    bg (Light) — warmer Off-White, NICHT grünlich getönt
paper200  #EDE7DA

ink50     #9AA89F    textFaint (Light)
ink400    #5C6B62    textMuted (Light)
ink600    #2A332D
ink800    #16201A
ink900    #0E1A12    text (Light)

night950  #06090A    bg (Dark, OLED-tauglich)
night900  #0E1416    surface (Dark)
night800  #171F22
night700  #202A2D

danger    #E5484D
warn      #E8A53C
info      #4F9CDC
```

### Semantische Tokens

Light & Dark Schemes komplett ausgespielt in `bolzplatz/tokens.jsx` unter `tokens.light` / `tokens.dark`. Wichtig:

- **`bg`**: Light = `paper100` (warmer Off-White), Dark = `night950` (OLED).
- **`surface`**: Light = `#FFFFFF`, Dark = `night900`.
- **`accent`**: Bolzplatz-Grün — Light: `green700`, Dark: `green500` (heller, weil OLED).
- **`warm`**: Tor-Orange (`orange500`) — beidseitig gleich. Wird gezielt für **Sondertipps, Streaks, Live-Status, Joker-Tipps** verwendet — NICHT als zweiter "Standard"-Akzent.
- **`live`**: gleicher Wert wie `warm` — semantisch getrennt, falls später anders behandelt.

### Spacing
```
xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48
```

### Radius
```
sm 10 · md 14 · lg 20 · xl 24 · xxl 32 · pill 999
```
Default für Cards: `xl` (24). Default für Buttons: `pill`.

### Font Size
```
xs 11 · sm 13 · md 15 · lg 17 · xl 22 · xxl 28 · display 36 · jumbo 48
```

### Shadow (statt Border, wo möglich)
```
shadowSm  0 1px 2px rgba(15,30,20,0.05), 0 1px 3px rgba(15,30,20,0.04)
shadowMd  0 4px 14px rgba(15,30,20,0.07), 0 1px 3px rgba(15,30,20,0.04)
shadowLg  0 12px 32px rgba(15,30,20,0.12), 0 2px 6px rgba(15,30,20,0.05)
```
Im Dark mit pureren Blacks (siehe Tokens).

### Fonts (Google Fonts)

```
display   'Familjen Grotesk'  — Headlines, Score, Buttons, Tab-Labels (700/800)
body      'Geist'             — Fließtext, Inputs, Beschreibungen (400/500/600)
mono      'JetBrains Mono'    — Daten, Codes, Punkte, UPPERCASE Section-Labels (400/500/600/700)
```

Familjen Grotesk **800** ist der Display-Default, **700** für Buttons / Component-Headlines.
JetBrains Mono mit `letter-spacing: 1.4–1.6` und `text-transform: uppercase` für Section-Labels — das ist das **prägnanteste Element** der ganzen Direction. Bitte konsequent durchziehen.

---

## Komponenten-System (Primitives)

Quelle: `bolzplatz/primitives.jsx`. Alle als reine functional components mit `t = tokens.light|dark` als Prop.

### `<Card>`
- Props: `variant: "default" | "elevated" | "accent" | "warm" | "flat"`, `padding: "sm" | "md" | "lg"`
- Default: `surface` bg, `R.xl` (24), `shadowSm`, padding `S.lg` (16).
- `elevated`: `shadowLg`.
- `accent` / `warm`: tonale Hintergründe (`accentSoft` / `warmSoft`) + 1px Border, **keine Shadow**.
- `flat`: `surface` bg + 1px Border, keine Shadow.

### `<Button>`
- Props: `variant: "primary" | "secondary" | "warm" | "ghost"`, `size: "sm" | "md" | "lg"`, `fullWidth`, `leftIcon`
- Sizes: `sm` 36px, `md` 48px, `lg` 56px hoch.
- **Border-Radius: `pill` (999)** — alle Buttons sind Pills, nicht abgerundete Rechtecke.
- **Font: Familjen Grotesk 700**, letter-spacing `-0.2`.
- `primary`: `accent` bg + `accentFg`, `shadowSm`.
- `secondary`: transparent bg, 1.5px Border `borderStrong`, `text` fg.
- `warm`: `warm` bg + `warmFg` — **nur für Sondertipp-/Streak-Aktionen**.
- `ghost`: `surfaceSunken` bg, kein Border.

### `<Badge>`
- Props: `tone: "neutral" | "accent" | "warm" | "live" | "danger"`
- Pill, **Font: JetBrains Mono 11px / weight 600 / letter-spacing 0.3**.
- Tone bestimmt bg / fg / border (siehe `primitives.jsx`).

### `<SectionLabel>`
- UPPERCASE Mono, 11px, weight 700, letter-spacing 1.4.
- Optional `action` rechts (akzentfarben, "‹text› ›").

### `<FlagSquare>`
- Team-Anker / Flaggen-Tile. `size` (default 56), `radius` (default 14), `gradient` als CSS-Linear/Radial-Gradient.
- `flagFor` Lookup in `primitives.jsx` enthält 16 Nationen-Gradients (Mexiko, Deutschland, Brasilien, …).

---

## Screens

Alle Screens leben in `bolzplatz/`. Geräte-Mockup ist iPhone 402×874 (siehe `ios-frame.jsx`). Padding-Konvention: `60px 20px 110px` (Status-Bar oben + Tab-Bar unten).

### Home — `screen-home.jsx`
- **Zweck**: Tagesaufschlag — nächstes Match prominent, offene Tipps, Liga-Stand, Sondertipps-Hinweis.
- **Layout**:
  - Header: "Moin" muted + `@username` als 36px Display 800.
  - **Hero-Card "Nächstes Match"**: Score-as-Hero — 64px Mono Score (oder "—:—" wenn nicht getippt), Team-Flags links/rechts, Anpfiff als Mono-Countdown `T-39d 10h`.
  - **Section "Offene Tipps"**: horizontal-scrollbare Liste kleiner Match-Cards mit Stub-Score und CTA-Pill "Tippen".
  - **Liga-Standing**: kompakte Card mit Rang/Punkte, Leader-Avatar.
  - **Sondertipp-Hinweis**: `warm`-toned Card mit Tor-Orange-Akzent.
- **Komponenten**: `Card variant="elevated"` für Hero, `Card variant="warm"` für Sondertipps, `Badge tone="live"` falls Match läuft.

### Spielplan — `screen-matches.jsx`
- **Zweck**: Alle Matches eines Spieltags / Turniers, gruppiert nach Tag.
- **Layout**:
  - Sticky-Header mit Spieltag-Tabs (z.B. "ST 14 · ST 15 · ST 16").
  - Pro Tag: `SectionLabel` mit Datum (Mono UPPERCASE) + Match-Liste.
  - Match-Row: Flag · Team links — Score zentral (Mono, groß, "—:—" wenn ungetippt) — Team · Flag rechts. Tap → Tip-Eingabe.
  - Live-Match: kleiner Tor-Orange Live-Dot (pulsiert) + `Badge tone="live"`.

### Meine Tipps — `screen-matches.jsx` (`MyTipsScreen`)
- **Zweck**: Persönliche Tipp-Historie, gefiltert nach offen / abgeschlossen.
- **Layout**: Filter-Pills oben, Liste mit Match-Row + getippter Score + Punkte-Badge (Mono).

### Ligen — `screens-misc.jsx` (`LeaguesScreen`)
- **Zweck**: Übersicht der Ligen, in denen User ist.
- **Layout**:
  - Two-Column-Header: `+ Erstellen` (primary) / `Beitreten` (secondary).
  - Liga-Cards mit Name als Display-Headline, Code in Mono, "Du bist Rang X · Y Pkt", Leader-Tag.

### Liga-Detail — `screen-league-detail.jsx`
- **Zweck**: Tabelle einer Liga mit allen Mitgliedern.
- **Layout**:
  - Hero: Liga-Name 36px Display, Code als Mono-Pill zum Teilen.
  - Tabelle: Rang · Avatar · `@user` · Punkte (Mono, rechtsbündig). Eigene Zeile akzentfarben hinterlegt (`accentSoft`).

### Sondertipps — `screen-special.jsx`
- **Zweck**: Saison-Bets (Meister, Torschützenkönig, Absteiger, …). Bewusst "entstopft" — nicht alles in eine lange Liste.
- **Layout**: Karten-Stack, jede Frage als eigene `Card variant="warm"` mit Frage als Display-Headline, gewählter Antwort als Pill, Stand "X von Y getippt".
- **Tor-Orange als Hauptfarbe dieses Screens** — bewusste Trennung von Tagesgeschäft.

### Tip-Eingabe — `screen-tip.jsx`
- **Zweck**: Score für ein Match eintippen.
- **Layout**:
  - Match-Header mit beiden Teams + Flags, groß.
  - **Zwei riesige Score-Wheels** (Mono, 96px) mit +/- Buttons drumrum.
  - Joker-Toggle (warm) falls Joker verfügbar — "Doppelter Punktwert".
  - Submit-Button (primary, full-width, lg).

### Einstellungen — `screen-settings.jsx`
- **Zweck**: Profil, Benachrichtigungen, Account.
- **Layout**: Sectioned List mit `SectionLabel` Header je Block, Rows mit Icon · Label · Value/Chevron rechts. Toggle für Push-Settings.

### Postfach — `screens-misc.jsx` (`InboxScreen`)
- **Zweck**: Broadcasts vom App-Team (Wochenrückblick, Tippreminder, Sondertipp-Alerts).
- **Layout**: Liste mit Read/Unread-Indikator (kleiner Dot in Akzentfarbe), Titel Display 600, Preview muted, Datum Mono.

### Composer — `screens-misc.jsx` (`ComposerScreen`)
- **Zweck**: **Admin-Tool** zum Verfassen von Broadcasts. Nicht User-facing.
- **Layout**: Form mit Title-Input, Body-Textarea, Audience-Picker, Vorschau-Card, Send-Button (primary, lg).

---

## Dark Variant

Alle Screens unterstützen `scheme="light" | "dark"`. Tokens wechseln komplett (siehe `tokens.dark`). Wichtig:
- `bg` ist `night950` (`#06090A`) — **OLED-tauglich**, fast pures Schwarz.
- `accent` springt von `green700` auf `green500` (heller), damit es auf dunklem Grund knallt.
- Shadows werden mit pureren Blacks gerendert.
- Tor-Orange bleibt unverändert — funktioniert auf beiden Schemes.

---

## Interactions & Behavior

Nicht in Mockups ausgespielt, aber gewünscht:

- **Tap auf Match-Row** → Push zur Tip-Eingabe. Falls Match in <60min → modaler Sheet statt Push.
- **Score-Wheel-Tap (+/-)**: 50ms light haptic.
- **Joker-Toggle**: 100ms scale-bounce + medium haptic, Card pulst kurz warm.
- **Submit-Tip**: optimistic update, Sheet swipt nach unten weg, Toast "Tipp gespeichert · Anpfiff in T-2h 14m".
- **Pull-to-refresh** auf Home, Spielplan, Meine Tipps, Ligen.
- **Live-Matches**: Live-Dot pulsiert 1s ease-in-out infinite, Score updated alle 30s (poll oder ws).
- **Loading**: Skeleton-Shimmer in `surfaceSunken` mit `accent` als Highlight, 1.4s linear infinite.
- **Empty State** (z.B. neue Liga, 0 Mitglieder): Icon-Placeholder + Display-Headline "Noch leer." + warm-button "Mitglieder einladen".
- **Error**: Toast mit `danger` bg, 3s auto-dismiss, retry-Button.

---

## State Management

- **Auth**: `@username`, `userId`, JWT.
- **Tipps**: `tips: { matchId: { home, away, joker, submittedAt, points? } }` — lokal optimistic, server-synced.
- **Ligen**: `leagues: League[]` — invalidate on join/leave.
- **Matches**: `matches: Match[]` mit `status: "scheduled" | "live" | "final"`, `liveScore`, `kickoff`. Live-Matches separat pollen.
- **Inbox**: `messages: Message[]` mit `read: bool`. Read-State server-synced.
- **Sondertipps**: separates Modell, eigene Submission-Deadline pro Frage.

---

## Assets

- **Keine Bitmap-Assets** in den Mockups. Alle Flaggen sind CSS-Gradients (`flagFor` in `primitives.jsx`) — als Platzhalter gedacht. Production sollte echte SVG-Flaggen oder Country-Code-API verwenden.
- **Keine Icons** — die Mockups nutzen Unicode-Glyphen als Stub (z.B. `⚙` für Settings). Empfehlung: **Lucide Icons** (matched zur Geist/Familjen-Grotesk-Optik) oder das Bestandssystem aus v0.16, falls vorhanden.
- **Avatare** sind farbige Kreise mit Initialen — Production sollte Cloudinary / S3 verwenden, mit Initial-Fallback in `accentSoft` bg + `accent` fg.

---

## Files in diesem Bundle

```
Bolzify Hi-Fi.html          ← Haupt-Prototype mit Live-A/B + Canvas (Tweaks-Panel)
Bolzify Mood Directions.html ← Vorstufe: 3 Mood-Directions zur Auswahl
design-canvas.jsx            ← Canvas-Wrapper (Pan/Zoom-Grid für Side-by-Side)
ios-frame.jsx                ← iPhone-Bezel
tweaks-panel.jsx             ← In-Page Tweak-Controls

bolzplatz/                   ← Finale Direction
  tokens.jsx                  → Token-Source-of-Truth (Farben/Spacing/Radius/Shadow/Fonts)
  primitives.jsx              → Card, Button, Badge, SectionLabel, FlagSquare, flagFor
  screen-home.jsx             → Home
  screen-matches.jsx          → Spielplan + Meine Tipps
  screen-special.jsx          → Sondertipps
  screen-tip.jsx              → Tip-Eingabe
  screen-league-detail.jsx    → Liga-Tabelle
  screen-settings.jsx         → Einstellungen
  screens-misc.jsx            → Ligen, Postfach, Composer
  screen-v016.jsx             → v0.16-Referenz für A/B-Vergleich (NICHT umsetzen — nur zum Abgleich)

moods/                       ← Verworfene Vorstufen (nur zur Kontextgabe, NICHT umsetzen)
  mood-bolzplatz-summer.jsx
  mood-stadionprogramm.jsx
  mood-stadium-night.jsx
```

## Wie die Mockups öffnen

`Bolzify Hi-Fi.html` lokal im Browser öffnen — startet im **Live A/B Modus** (eine Phone-Stage mit Tweak-Panel zum Durchschalten der Screens und Light/Dark). Oben rechts auf `CANVAS →` klicken für die Übersicht **aller** Artboards (Tokens, Hauptscreens Light, Detail-Screens, Dark Variant, A/B vs v0.16).

Das Tweak-Panel im A/B-Modus erlaubt:
- Screen wählen (Home, Spielplan, …)
- Theme wechseln (light / dark)
- Side-by-Side mit v0.16 (nur für Home hinterlegt)

## Open Questions / Punkte für Design-Devsync

1. **Icon-System**: Lucide oder Bestand? Bitte Designer fragen.
2. **Animations-Library**: React Native Reanimated 3 + Moti? — passt zu den gewünschten Mikro-Interaktionen.
3. **Live-Updates**: Polling (30s) reicht zum Start oder direkt WebSocket?
4. **Sondertipps**: Sind die "Fragen" hardcoded pro Saison oder admin-konfigurierbar via Composer?
5. **Joker-Regelwerk**: Wie viele Joker pro Saison/Liga? UI zeigt "verfügbar/verbraucht", aber das Modell ist nicht festgelegt.
