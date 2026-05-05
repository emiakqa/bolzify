# Sentry — Setup für Bolzify

Sentry ist als Crash-Reporting + Error-Tracking integriert. Setup ist **einmalig** vor dem ersten TestFlight/Production-Build erforderlich. Bis dahin läuft die App ohne Sentry — Wrapper sind silent no-op.

---

## 1. Sentry-Account anlegen

1. Auf [sentry.io](https://sentry.io) anmelden (Google-Login OK).
2. **Wichtig: EU-Region wählen** (Frankfurt, `de.sentry.io`) — DSGVO-freundlich.
3. Plan: **Developer (Free)** reicht — 5k Errors/Monat, 1 User.
4. **Create Project**:
   - Platform: **React Native**
   - Project name: `react-native` (Default ist OK — kann später in Sentry-Settings umbenannt werden)
   - Default Alert: nicht nötig fürs MVP
5. Nach dem Anlegen siehst du den **DSN**. EU-DSN sieht aus wie:
   ```
   https://abc123def456@o12345.ingest.de.sentry.io/9876543
   ```

## 1a. Wizard NICHT ausführen

Sentry zeigt dir prominent eine "Automatic Configuration"-Box mit dem Wizard
(`npx @sentry/wizard@latest -i reactNative …`). **Nicht ausführen**: das SDK
und der Init-Code sind in diesem Repo bereits manuell integriert
(`lib/sentry.ts` + `app/_layout.tsx`). Der Wizard würde diese Files
überschreiben/duplizieren.

Was der Wizard zusätzlich machen würde, das wir noch NICHT haben:
- Source-Maps-Upload im EAS-Build
- Debug-Symbols-Upload (iOS dSYM)

Beides ist optional — siehe Schritt 3.

## 2. DSN in `.env` eintragen

```bash
# Bolzify-Projekt-Root → .env
EXPO_PUBLIC_SENTRY_DSN=https://abc123def456@o12345.ingest.us.sentry.io/9876543
```

`.env` ist in `.gitignore`, der DSN landet nie in Git. **Hinweis:** Auch wenn der DSN per Definition öffentlich ist (steht später im App-Bundle), gehört er nicht ins Repo.

## 3. Source Maps — Auth-Token einrichten

Damit Sentry minified Bundle-Stack-Traces (`index.android.bundle:1:5234567`)
auf den Original-Code (`app/(tabs)/index.tsx:142:18`) mapped, braucht der
EAS-Build einen Sentry Auth-Token. Plugin-Config in `app.json` ist bereits
vorbereitet — du musst nur den Token erstellen und in EAS ablegen.

### 3.1 Token in Sentry erstellen

1. Auf [de.sentry.io](https://de.sentry.io) einloggen.
2. **User-Avatar oben rechts → User Settings → Auth Tokens**
   (oder direkt: `https://de.sentry.io/settings/account/api/auth-tokens/`)
3. **Create New Token** klicken.
4. **Name** (frei wählbar): `bolzify-eas-build`
5. **Scopes** (mindestens):
   - `project:releases` — Releases anlegen, Source Maps hochladen
   - `project:write` — Project-Updates
   - `org:read` — Organisation lesen
6. **Create Token** klicken.
7. **Token sofort kopieren** — der wird nur einmal angezeigt! Format:
   `sntrys_eyJpYXQiOj…`

### 3.2 Token in EAS Secrets ablegen

```bash
cd /pfad/zu/bolzify
npx eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "sntrys_xxx" --type string
```

Verify mit:
```bash
npx eas secret:list
# erwartet: SENTRY_AUTH_TOKEN  STRING  ********
```

Der Plugin-Code in `app.json` zieht `SENTRY_AUTH_TOKEN` automatisch aus der
Umgebung. Beim nächsten `eas build` werden Source Maps **automatisch** zu
Sentry hochgeladen — kein Code-Change mehr nötig.

### 3.3 Verifizieren

Beim EAS-Build sollte in den Logs auftauchen:
```
[expo-config-plugin] @sentry/react-native: Configuring Sentry…
[sentry] Uploading source maps to Sentry…
[sentry] Source map for index.android.bundle uploaded
```

Nach dem Build in Sentry: **Releases → bolzify@1.0.0** sollte Source Maps
listen. Bei einem Test-Crash danach sollten Stack-Traces auf konkrete
TypeScript-Files zeigen.

### 3.4 Lokaler Build (optional)

Wenn du auch lokal builden willst (`expo prebuild` + nativer Build), trage
den Token zusätzlich in `.env` ein:
```
SENTRY_AUTH_TOKEN=sntrys_xxx
```
Niemals committen — `.env` ist gitignored.

## 4. Lokales Test (Dev-Build, nicht Expo Go!)

Sentry braucht Native Code. Test-Reihenfolge:

```bash
# 1. Dev-Client neu bauen (einmalig nach Plugin-Add)
npx eas build --profile development --platform ios

# 2. Build aufs Gerät installieren, App starten
# 3. Settings → Dev → "Sentry: Test-Capture" antippen
# 4. In sentry.io → Issues → "Bolzify Sentry test from settings" sollte erscheinen
```

**Wichtig:** In `__DEV__`-Modus sendet Sentry keine Events (wäre Quota-Verschwendung bei jedem Hot-Reload). Erst Release-Build / TestFlight zeigt Events in sentry.io. Lokales DEV-Logging zeigt aber `[capture]` in der Console.

## 5. Was wird erfasst?

- ✅ JS-Crashes mit Stack-Trace
- ✅ Native Crashes (iOS Objective-C / Android Kotlin)
- ✅ Manuelle `captureException()` aus dem Code
- ✅ Anonymer User-Context (Supabase-UUID — keine Email, kein Username)
- ✅ Release-Tag (`bolzify@1.0.0`) + Build-Number
- ❌ Keine PII (Cookies, Headers, IPs werden in `beforeSend` gestrippt)
- ❌ Keine Performance-Traces (Quota-Schoner — `tracesSampleRate: 0`)
- ❌ Keine Session-Replays

## 6. Datenschutz

Da Sentry IPs + Device-Info empfängt, ist es ein **Auftragsverarbeiter**. Die `docs/privacy.html` listet Sentry mittlerweile als Subprozessor. Optional kannst du in Sentry Settings → **Data Scrubbing** zusätzlich „Scrub IP Addresses" aktivieren, um sicher zu gehen.

## 7. Wo wird `captureException()` aufgerufen?

Aktuell nur:
- `app/settings.tsx` Dev-Test-Button

Erweiterung sinnvoll an Stellen wo wir bisher silent catchen:
- `lib/notifications.ts` — wenn Reminder-Sync fehlschlägt
- `lib/supabase.ts` — bei Auth-Fehler-Edge-Cases
- Hintergrund-Tasks die der User nie sieht

Das wird **nicht** für sichtbare ErrorCard-Fälle gemacht — die zeigt der User schon dem Support, doppelt erfassen ist Quota-Verschwendung.

## 8. Free-Tier Quota

5.000 Errors/Monat. Falls überschritten:
- Erstmal nichts — Sentry zeigt es als „rate limited" und wirft Events weg.
- Dann checken **welcher Issue** spamt (vermutlich ein wiederkehrender Bug bei vielen Usern).
- Bug fixen → Quota erholt sich automatisch im nächsten Abrechnungszeitraum.

Bei echtem Bedarf: **Team Plan** ab 26 USD/Monat = 50k Errors. Erst nach 1.000+ aktiven Usern relevant.
