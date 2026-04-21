# Bolzify — Logo & App-Icon Brief

Kontext-Dokument für KI-Design-Tools (Claude Design, Midjourney, Gemini, etc.)
zum Erstellen des finalen Logos + App-Icon-Sets.

---

## 1. Was ist Bolzify?

**Bolzify** ist eine Fußball-Tippspiel-App für die **FIFA WM 2026** (Launch vor
11.06.2026). Freunde tippen Spiel-Ergebnisse + Torschützen, sehen Rankings in
privaten Ligen. Positioniert als **moderner Konkurrent zu Kicktipp/Comunio** —
gleiche Mechanik, aber mit BeReal-/Strava-Ästhetik statt 2010er-Look.

Zielgruppe: 18–35, DACH primär, Fußball-affin, Smartphone-native. Nutzung
hauptsächlich **abends/vor Anpfiff**, oft im Freundeskreis-Chat geteilt.

## 2. Name — warum "Bolzify"?

- **"Bolzen"** = umgangssprachlich Fußballspielen auf dem Bolzplatz
  (Straße/Asphalt/Hinterhof). Starke DACH-Emotion: Kindheit, Sommer,
  improvisierte Tore aus Jacken.
- **"-ify"** = modernes App-Suffix (Spotify, Shopify) → Verben daraus machen.
- Claim-Idee: *"Bolzen wir?"* / *"Let's bolz."*

Die Marke soll diese **Spannung zwischen Bolzplatz-Nostalgie und App-Moderne**
transportieren. Nicht: Hochglanz-Stadion, FIFA-Offiziell, Wettbüro-Ästhetik.

## 3. Visuelle Richtung

### Mood / Stimmung
- Straße, Asphalt, Kreide, Leder-Ball, Flutlicht
- Warm, nostalgisch, aber **reduziert und modern** — nicht retro-kitschig
- Eher **Strava / Duolingo / BeReal** als **FIFA / Sky Sport / Tipico**

### Zu vermeiden
- Generische Fußbälle als Hauptmotiv (zu kommerz-sportlich)
- Nationalflaggen, WM-Trophäen, spezifische Vereins-Anspielungen
- Hochglanz-3D-Renderings, Chrome, Gradients im "Gaming"-Stil
- Wett-/Casino-Ästhetik (rot-schwarz, Goldmünzen, Würfel)
- Emojis / Mascots mit Gesicht

### Was ja
- Monogramm-**B** oder kurzer Wortmark ("bolzify", lowercase wirkt App-iger)
- Piktogramm-Elemente: Bolzplatz-Tor aus 2 Strichen, Kreide-Linie,
  Ball als Punkt, Asphalt-Textur
- Kreide-/Rough-Anmutung ist willkommen, **aber lesbar bleiben @48×48 px**
- Negative-Space-Tricks (z. B. Ball im Bauch des B) funktionieren

## 4. Farbpalette (aus `constants/design.ts`)

Primär:
- **Bolzplatz-Grün:** `#2E7D32` (grass500), `#1B5E20` (grass700 dunkler),
  `#66BB6A` (grass300 heller)
- **Leder-Braun:** `#5D4037` (leather600), `#8D6E63` (leather400)
- **Signal-Orange (nur Akzent):** `#FF6F00` (signal500)

Hintergründe:
- **Dark-Mode (Default, "Flutlicht"):** `#0F0F0F` / `#1A1A1A`
- **Light-Mode:** `#FAFAFA`

Icon-Empfehlung: **Dark-Mode-Hintergrund** mit grünem/weißem B — matched den
App-Look (Dark ist Default). Light-Variante optional für Pressemappe.

## 5. Was gebraucht wird (Deliverables)

1. **App-Icon 1024×1024 px** — iOS/Android, PNG + SVG-Source
   - iOS: erscheint mit abgerundeten Ecken (System-Mask), also **Bleed bis zum Rand**
   - Android adaptive: **foreground + background** separat (108×108 dp safe zone zentriert)
2. **Splash-Screen-Logo** — zentriertes Monogramm auf `#0F0F0F`, ca. 512×512
3. **Wordmark-Lockup** (horizontal) — "bolzify" lowercase neben Monogramm,
   für Website / Store-Header
4. **Monochrome Variante** — 1-Farbe weiß auf dunkel, für Notifications / Share-Grafiken

## 6. Technische Constraints

- Muss **@48×48 px lesbar** bleiben (Tab-Icon-Größe)
- Keine Texte im App-Icon (iOS/Android Store-Richtlinie) — außer dem Monogramm-B selbst
- SVG-Source bitte mit einfachen Pfaden (keine Filter/Masks, die beim Icon-Export brechen)
- Ecken-Radius für iOS: nicht selbst runden — System macht das. Volles Quadrat abliefern.

## 7. Bisherige Konzept-Richtungen (als Inspiration)

Wir haben 3 Richtungen intern durchgespielt (liegen als SVG in diesem Ordner):

- **A — "Chalk-B"**: Kreide-B auf Asphalt, rough-Filter, Ball im unteren Bauch.
  *Stärke:* Nostalgie + Bolzplatz-Claim. *Schwäche:* Rough-Filter bei kleinen
  Größen matschig.
- **B — "Bolzplatz-Tor"**: Minimales Straßentor-Piktogramm mit Netz-Pattern +
  Ball. *Stärke:* super lesbar. *Schwäche:* generisch-fußballerisch, keine
  Wortmarken-Brücke.
- **C — "Split-Monogram"**: Geometrisches B, oberer Bauch grün, unterer Leder,
  weißer Hintergrund. *Stärke:* am modernsten. *Schwäche:* am wenigsten
  nostalgisch.

**Idealfall: Kombination aus A (Nostalgie) und C (Klarheit).** Also ein
monogrammatisches B, das den Bolzplatz-Geist transportiert, aber bei 48 px
noch klar lesbar ist. Ball-Andeutung als Negative Space > als aufgeklebtes Element.

## 8. Tone-of-voice der Marke (als Stil-Hinweis)

Locker, direkt, deutsch-freundschaftlich:
- *"Tipp abgeben"*, *"Bolzen wir?"*, *"Flutlicht an"*
- Nicht: *"Tippschein erstellen"*, *"Dein Coupon"*

Das Logo sollte zu **"Bolzen wir?"** passen, nicht zu **"Offizielle
Prognose-Plattform"**.

---

## Prompt-Vorschlag für KI-Design-Tool

> Erstelle ein App-Icon für "Bolzify", eine moderne Fußball-Tippspiel-App mit
> Bolzplatz-Nostalgie-Feel. Monogramm-"B" im Zentrum, dunkler
> Hintergrund (#0F0F0F), grüner Hauptton (#2E7D32) mit Leder-Akzent (#5D4037).
> Stil: reduziert, geometrisch, leicht handgemacht (Kreide-Anmutung ok,
> aber @48px lesbar). Kein 3D, keine Gradients, kein generischer Fußball.
> 1024×1024, volles Quadrat (System rundet Ecken). Liefere 3 Varianten.
