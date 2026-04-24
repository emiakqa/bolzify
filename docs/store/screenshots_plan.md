# Screenshots-Plan — Bolzify

Stand: 2026-04-24

## Pflicht-Größen

### iOS (App Store Connect)

| Gerät | Auflösung | Anzahl Pflicht | Anzahl Maximum |
|---|---|---|---|
| 6.9" iPhone (16 Pro Max) | 1320 × 2868 px | 3 | 10 |
| 6.7" iPhone (15 Pro Max) | 1290 × 2796 px | 3 | 10 |
| 6.5" iPhone (XS Max) | 1242 × 2688 px | optional, fallback automatisch | 10 |
| 13" iPad Pro M4 | 2064 × 2752 px | nur falls iPad-Universal-App | 10 |

> **Strategie:** 6.9" als Master rendern, Apple skaliert automatisch auf kleinere Devices. iPad nur falls Universal-Build aktiviert (für v1.0.0 NICHT notwendig — wir submitten iPhone-only).

### Android (Play Console)

| Gerät | Auflösung | Anzahl Pflicht | Anzahl Maximum |
|---|---|---|---|
| Phone | min. 1080 × 1920 px (16:9 oder 9:16) | 2 | 8 |
| 7" Tablet | 1024 × 600 px min | optional | 8 |
| 10" Tablet | 1280 × 800 px min | optional | 8 |
| **Feature Graphic** | 1024 × 500 px | **Pflicht** | 1 |

## Welche Screens? (Reihenfolge = Empfohlene Anzeigereihenfolge)

### #1 — Hero: Live-Ranking einer Liga
**Screen:** `app/league/[id].tsx` mit min. 5 Mitgliedern, sichtbarer Punktedifferenz, Krone fürs Top-Spot
**Caption:** "Schlag deine Freunde im Live-Ranking"
**Setup:**
- Test-Daten mit realistischen Namen (Max, Lisa, Tom, Anna, Felix)
- Punkte-Spread: 47 / 42 / 38 / 31 / 24
- Aktueller User auf Platz 2 mit "+5 heute" Badge

### #2 — Spielplan mit Tipps
**Screen:** `app/(tabs)/matches.tsx` mit Mix aus getippten + ungetippten Spielen
**Caption:** "104 WM-Spiele tippen — bis zum Anpfiff änderbar"
**Setup:**
- 3 Spiele mit grünem Tipp-Badge (z.B. 2:1, 0:0, 3:2)
- 2 Spiele mit orangem "Noch tippen!" Badge
- 1 Live-Spiel mit pulsierendem roten Dot

### #3 — Tipp-Modal
**Screen:** Match-Detail mit geöffnetem Tipp-Sheet
**Caption:** "Bonus: Tippe den ersten Torschützen für +3 Punkte"
**Setup:**
- Spiel: Deutschland vs. Frankreich
- Tipp: 2:1
- Torschützen-Picker geöffnet mit "Musiala" gewählt
- Countdown sichtbar: "noch 2h 14min"

### #4 — Sondertipps
**Screen:** `app/special-tips.tsx` mit ausgefüllten Tipps
**Caption:** "Sondertipps: Wer wird Weltmeister 2026?"
**Setup:**
- Weltmeister: Deutschland (Flagge prominent)
- Finalgegner: Brasilien
- Halbfinalisten: Spanien, Argentinien
- Torschützenkönig: Mbappé

### #5 — Punkte-Detail
**Screen:** `app/(tabs)/index.tsx` mit Stats-Card sichtbar oder eigene `app/stats.tsx`
**Caption:** "Live-Punkte: 6 fürs exakte Ergebnis, +3 für den Torschützen"
**Setup:**
- "Deine Punkte: 47"
- Letztes Spiel: Argentinien 2:1 Mexiko, Tipp 2:1, Punkte +6
- Bonus-Tipp Messi: +3
- Mini-Grafik der letzten 5 Spieltage

### #6 — Liga-Setup (Onboarding-Vibe)
**Screen:** `app/leagues-new.tsx` oder Liga-Beitritt-Modal mit Code-Eingabe
**Caption:** "Eigene Liga in 30 Sekunden — Code teilen, fertig"
**Setup:**
- Liga-Name: "WG Tipprunde 2026"
- 6-stelliger Code groß: "B7K9X2"
- Share-Sheet teilweise sichtbar (WhatsApp/Messages)

### #7 — Privacy First (Differenzierung!)
**Screen:** `app/(tabs)/profile.tsx` mit Datenschutz-Sektion sichtbar
**Caption:** "Keine Werbung. Kein Tracking. Daten in der EU."
**Setup:**
- Settings sichtbar mit Privacy-Bullets
- Account-Löschen-Button erreichbar
- Klar: NICHTS verkauft, NICHTS getrackt

### #8 — (Optional) Onboarding/Welcome
**Screen:** First-Launch oder Login-Screen
**Caption:** "In unter einer Minute startklar"

## Feature Graphic (Play Store Pflicht)
**Größe:** 1024 × 500 px
**Inhalt:** Hero-Visual mit Bolzify-Logo, "WM 2026" prominent, 3 Phone-Mockups schräg gestapelt (Liga-Ranking + Spielplan + Sondertipps), grüne Bolzplatz-Akzente (#22c55e auf #0a0e0a)

## Tools-Vorschläge

- **Mockup-Generator:** [shots.so](https://shots.so), [previewed.app](https://previewed.app), [mockuphone](https://mockuphone.com)
- **Frame + Caption:** [Picstoreapp](https://picstoreapp.com), [Screenshots Pro](https://screenshots.pro)
- **Manuell:** Figma-Template "App Store Screenshots" (kostenlos in Community)
- **Lokale Screenshots:** iOS Simulator (16 Pro Max) → Cmd+S, Android Emulator (Pixel 8 Pro) → Capture

## Workflow

1. Branch `screenshots` checkouten, Test-Daten in Supabase seeden (`npm run seed:screenshots` falls vorhanden)
2. Login als Demo-User `screenshots@bolzify.de`
3. Pro Screen: iOS Sim 16 Pro Max → Screenshot, dann Android Emulator (Pixel 8 Pro Portrait)
4. Mockup-Tool anwenden mit deutscher Caption
5. Export PNG, ablegen in `docs/store/screenshots/{ios,android}/{01-ranking,02-matches,...}.png`
6. In App Store Connect / Play Console hochladen

## Lokalisierung

- Erste Iteration: nur deutsche Captions
- Falls App-Store-Listing ENG aktiv → englische Captions in separatem Set unter `/screenshots/en/`

## Status-Tracker

| # | Screen | DE | EN | iOS | Android |
|---|---|---|---|---|---|
| 1 | Liga-Ranking | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Spielplan | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Tipp-Modal | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Sondertipps | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Punkte-Detail | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Liga-Setup | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Privacy | ⬜ | ⬜ | ⬜ | ⬜ |
| F | Feature Graphic Play | – | – | – | ⬜ |
