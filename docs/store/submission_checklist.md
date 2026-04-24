# Submission Checklist — Bolzify v1.0.0

Stand: 2026-04-24
Ziel-Submission: spätestens **2026-05-25** (TestFlight Beta) → **2026-06-04** (App Store Review) → **2026-06-11** Launch

---

## 0. Vorbereitung (einmalig)

### Apple Developer Account
- [ ] Apple Developer Program Membership aktiv (99 USD/Jahr)
- [ ] Apple ID mit Two-Factor-Auth (Pflicht für API-Key)
- [ ] App Store Connect Zugang als Admin
- [ ] App Store Connect API Key generiert (`secrets/asc-api-key.p8`)
  - Issuer ID notiert
  - Key ID notiert
- [ ] Apple Team ID notiert (10-stellig)
- [ ] Bundle Identifier `de.bolzify.app` registriert in Developer Portal
- [ ] App in App Store Connect angelegt (mit SKU `bolzify-001`, Primary Language `Deutsch`)

### Google Play Account
- [ ] Google Play Console Developer Account aktiv (25 USD einmalig)
- [ ] Service Account JSON erstellt (`secrets/play-service-account.json`)
- [ ] Service Account in Play Console verknüpft mit "Release Manager"-Rolle
- [ ] App in Play Console angelegt (Package `de.bolzify.app`, Default Language `Deutsch`)

### EAS / Expo
- [ ] `npx eas-cli login` erfolgreich
- [ ] `npx eas-cli init` lief, Project-ID in `app.json` eingetragen
- [ ] `[EXPO_USERNAME]` Platzhalter in `app.json` ersetzt
- [ ] `eas.json` Submit-Sektion: Apple-Credentials + Play-Path eingetragen

---

## 1. Build-Pflicht

| Item | iOS | Android |
|---|---|---|
| App-Icon 1024 × 1024 (PNG, kein Alpha, kein transparenter Hintergrund) | ⬜ | ⬜ |
| Adaptive Icon (Android: 432 × 432 Foreground + Background-Color) | – | ⬜ |
| Splash-Screen | ⬜ | ⬜ |
| Production-Build durch EAS erstellt | ⬜ | ⬜ |
| Build lokal getestet (TestFlight Internal / Internal Testing Track) | ⬜ | ⬜ |
| Crash-frei in Smoke-Test (Login → Tipp → Liga → Sondertipp → Logout) | ⬜ | ⬜ |

## 2. Store-Listing

### iOS App Store Connect

| Item | Quelle/Wert | Status |
|---|---|---|
| App Name | `Bolzify` | ⬜ |
| Untertitel | aus `listing_de.md` | ⬜ |
| Kategorie Primär | Sport | ⬜ |
| Kategorie Sekundär | Unterhaltung | ⬜ |
| Beschreibung DE | aus `listing_de.md` | ⬜ |
| Beschreibung EN | aus `listing_en.md` | ⬜ |
| Keywords DE | aus `listing_de.md` | ⬜ |
| Keywords EN | aus `listing_en.md` | ⬜ |
| Werbetext | aus `listing_de.md` | ⬜ |
| Was ist neu | aus `listing_de.md` v1.0.0 | ⬜ |
| Support URL | `https://emiakqa.github.io/bolzify/support.html` | ⬜ |
| Marketing URL | `https://emiakqa.github.io/bolzify/` | ⬜ |
| Datenschutz URL | `https://emiakqa.github.io/bolzify/privacy.html` | ⬜ |
| Copyright | `© 2026 [NAME]` | ⬜ |
| Altersfreigabe-Fragebogen | alle "Niemals" / kein UGC öffentlich | ⬜ |
| Screenshots 6.9" iPhone (mind. 3) | aus `screenshots_plan.md` | ⬜ |
| Screenshots 6.7" iPhone (mind. 3) | aus `screenshots_plan.md` | ⬜ |

### Android Play Console

| Item | Quelle/Wert | Status |
|---|---|---|
| App Name | `Bolzify` | ⬜ |
| Kurzbeschreibung | aus `listing_de.md` (max 80) | ⬜ |
| Vollständige Beschreibung | aus `listing_de.md` | ⬜ |
| App-Icon 512 × 512 | – | ⬜ |
| Feature Graphic 1024 × 500 | aus `screenshots_plan.md` | ⬜ |
| Phone-Screenshots (mind. 2, max 8) | aus `screenshots_plan.md` | ⬜ |
| Kategorie | Sport | ⬜ |
| Tags | Sport, Soziales, Trivia | ⬜ |
| Kontakt-E-Mail | `[KONTAKT_EMAIL]` | ⬜ |
| Datenschutz URL | `https://emiakqa.github.io/bolzify/privacy.html` | ⬜ |

## 3. Privacy / Compliance

### iOS — App Privacy (App Store Connect)
- [ ] Datenkategorie: **Identifikatoren — E-Mail-Adresse**, Verwendung: App-Funktionalität, Verknüpft mit User: ja, Tracking: nein
- [ ] Datenkategorie: **Nutzerinhalte — Andere Nutzerinhalte (Profilname, Tipps)**, Verwendung: App-Funktionalität, Verknüpft mit User: ja, Tracking: nein
- [ ] Datenkategorie: **Nutzerinhalte — Fotos** (nur falls Profilbild aktiv), Verwendung: App-Funktionalität, Verknüpft mit User: ja, Tracking: nein
- [ ] Tracking: **Nein**
- [ ] Account-Deletion in App: **Ja** (Pflicht seit iOS 17 für Apps mit Account)

### Android — Data Safety Form (Play Console)
- [ ] Erhobene Datentypen: E-Mail, Name, Fotos (optional), App-Aktivität (Tipps)
- [ ] Verwendungszwecke: App-Funktionalität, Konto-Verwaltung
- [ ] Datenfreigabe an Dritte: **Nein** (Supabase ist Auftragsverarbeiter, keine Freigabe)
- [ ] Daten verschlüsselt während Übertragung: **Ja** (TLS)
- [ ] Nutzer kann Daten-Löschung anfordern: **Ja** (in-app)

### DSGVO / EU
- [ ] Privacy-Policy live unter `https://emiakqa.github.io/bolzify/privacy.html`
- [ ] Impressum live unter `https://emiakqa.github.io/bolzify/impressum.html`
- [ ] Auftragsverarbeitungsvertrag mit Supabase abgeschlossen
- [ ] Liste der Subprozessoren dokumentiert (Supabase, Expo/EAS, Apple, Google)
- [ ] `[NAME]`, `[STRASSE]`, `[KONTAKT_EMAIL]` in allen drei HTML-Files ersetzt

## 4. Export-Compliance & Rechtliches

- [ ] iOS: Encryption-Frage in App Store Connect = **Ja, nutzt nur Standard-iOS-Krypto (TLS, Keychain)** → Kein ERN nötig
- [ ] Android: kein Equivalent
- [ ] Content Rights: keine Drittanbieter-Inhalte angegeben (api-football durch Pro-Plan abgedeckt)
- [ ] Trademark-Suche für "Bolzify" abgeschlossen — kein Konflikt
- [ ] FIFA-/UEFA-/DFB-Logos werden NICHT verwendet (offizielle Bezeichnung "FIFA Fußball-Weltmeisterschaft 2026" nur im Beschreibungstext, nicht im Icon/Marketing)

## 5. Test-Account für Reviewer

- [ ] Account `review@bolzify.de` in Production-Datenbank angelegt
- [ ] Passwort gesetzt und in Review-Notes eingetragen
- [ ] Account ist Mitglied von 2 Test-Ligen mit anderen "Fake"-Mitgliedern
- [ ] Account hat Sondertipps abgegeben
- [ ] Account hat min. 5 Match-Tipps abgegeben (mix aus past/future)
- [ ] E-Mail-Confirmation für diesen Account übersprungen oder bestätigt

## 6. Beta-Phase (TestFlight + Play Internal Testing)

### TestFlight (iOS)
- [ ] Internal-Testing-Group "Bolzify Core" angelegt (max 100 Tester, kein Review)
- [ ] External-Testing-Group "Bolzify Beta" angelegt (max 10.000, Beta-Review nötig)
- [ ] Beta-Testanleitung geschrieben
- [ ] Beta-Feedback-Email aktiv

### Play Internal Testing (Android)
- [ ] Closed-Testing-Track "Internal" angelegt
- [ ] Tester-Liste per Google Group
- [ ] Opt-in-URL geteilt

## 7. Submission

- [ ] Build hochgeladen via `npx eas-cli submit -p ios --latest`
- [ ] Build hochgeladen via `npx eas-cli submit -p android --latest`
- [ ] Im Apple Reviewer-Hinweisfeld den Test-Account angegeben
- [ ] In Play Console: "Production"-Release erstellt, Rollout 100%
- [ ] App "Submitted for Review" / "In Review"

## 8. Nach Approval

- [ ] iOS: "Manuell veröffentlichen" gewählt (für koordinierten Launch)
- [ ] Android: Production-Release auf "Halt" oder Rollout-Schedule
- [ ] Launch-Termin **2026-06-11 — 17:00 MEZ** (1h vor erstem WM-Anpfiff)
- [ ] Social-Media-Push vorbereitet
- [ ] Monitoring: Sentry / Supabase-Logs / Crashlytics-Alarm aktiv

---

## Kritische Risiken / Blocker

| Risiko | Impact | Mitigation | Deadline |
|---|---|---|---|
| api-football Pro läuft 2026-05-23 ab | App ohne Live-Daten | Auto-Renewal aktivieren, Reminder gesetzt | 2026-05-20 |
| Apple Review länger als 7 Tage | Verpasster Launch | Submission spätestens 2026-06-01 | 2026-06-01 |
| Crash in Production | Bad PR am Launchtag | TestFlight Beta mit min. 20 Testern | 2026-05-25 |
| KO-Bracket erst nach 26.06. verfügbar | Tipps fehlen | Auto-Cron, der ab 27.06. Fixtures importiert | 2026-06-26 |
| Trademark-Konflikt "Bolzify" | Rebrand nötig | Suche bereits durchgeführt — clean | – |
