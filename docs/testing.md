# Bolzify — Automatisierte Tests

> **Stand:** 2026-05-04 — Infrastruktur aufgesetzt (Maestro-Flows + testIDs + Doku),
> aber lokaler Run auf Windows + Android-Emulator ist nicht stable.
> Empfohlener nächster Versuch: Maestro Cloud (managed Devices) oder Detox.
> Details unten unter [Aktueller Status & Known Issues](#aktueller-status--known-issues).

## Stack-Entscheidung

- **E2E / UI-Flows:** [Maestro](https://maestro.mobile.dev/) — YAML-Flows, läuft gegen iOS-Simulator, Android-Emulator und reale Geräte. Funktioniert mit Expo Go (Dev) **und** EAS-Builds.
- **Unit / RPC-Tests:** noch offen (Vorschlag: Vitest für `lib/*.ts`, PG-TAP für Scoring-RPCs).

Maestro wurde gewählt, weil:
1. Keine Code-Eingriffe in der App nötig — wir taggen nur `testID`-Props.
2. Funktioniert mit Expo Go im Dev-Modus → kein EAS-Build nötig für lokale Smoke-Tests.
3. YAML statt JS — niedriger Lock-In, leicht für Nicht-Devs zu lesen.
4. Kostenloser Cloud-Runner verfügbar (Maestro Cloud) — für CI ohne eigene Infra.

## Maestro installieren (einmalig)

### Windows (empfohlen via Scoop)

```pwsh
scoop bucket add extras
scoop install maestro
maestro --version    # sollte ≥ 1.39 zeigen
```

### Mac

```bash
brew tap mobile-dev-inc/tap
brew install maestro
```

### Manuell (Cross-Platform)

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Details: <https://maestro.mobile.dev/getting-started/installing-maestro>.

## Voraussetzungen vor dem ersten Lauf

1. **Bolzify läuft** entweder
   - in **Expo Go** (`npm start` + Gerät verbunden), oder
   - als installierter EAS-Dev-Build (`eas build --profile development --platform ios`).
2. **iOS-Simulator** oder **Android-Emulator** offen — Maestro pickt automatisch das aktive Device. Reales Gerät via USB geht ebenfalls.
3. **Test-Account** in Supabase angelegt (für Sign-In-Smoke):
   ```sql
   -- in Supabase-SQL-Editor:
   -- (Supabase Auth → Users → "Add user" → E-Mail "maestro@bolzify.test", Passwort "TestPass123!")
   ```
   ODER laufe nur den `auth_signup.yaml`-Flow — der legt selbst pro Run einen frischen User an.
4. **Email-Confirmation** in Supabase Auth ist **AUS** (Dev-Standard) — sonst hängt der Sign-Up-Flow am "Check dein Postfach"-Hinweis.

## Flows ausführen

### Smoke-Suite (~30s)

Schneller Health-Check vor jedem Push. Nur Auth-Flow.

```bash
maestro test \
  -e TEST_EMAIL=maestro@bolzify.test \
  -e TEST_PASSWORD=TestPass123! \
  --include-tags=smoke \
  .maestro/
```

### Voller Regression-Lauf (~2 Min)

Vor jedem Release / vor Beta-Submission.

```bash
maestro test \
  -e TEST_EMAIL=maestro@bolzify.test \
  -e TEST_PASSWORD=TestPass123! \
  --include-tags=regression \
  .maestro/
```

### Einzel-Flow

```bash
maestro test .maestro/flows/auth_signin.yaml \
  -e TEST_EMAIL=maestro@bolzify.test \
  -e TEST_PASSWORD=TestPass123!
```

### Recording / Debug

Live-View des Geräts mit Inspector — hilft beim Schreiben neuer Flows:

```bash
maestro studio
```

Browser-UI auf <http://localhost:9999> → klick auf Elemente → kopier dir die testIDs / Texte raus.

## Flow-Übersicht

| Flow | Tag | Was wird getestet |
|---|---|---|
| `auth_signin.yaml` | `smoke`, `auth` | Sign-In mit existierendem Test-Account → Tab-Bar sichtbar |
| `auth_signup.yaml` | `regression`, `auth` | Sign-Up mit unique Username/Mail → Tab-Bar sichtbar |
| `auth_validation.yaml` | `regression`, `auth` | Client-side Validation-Guards (leere Felder, Passwort-Länge, AGB-Disable) |
| `tip_submit.yaml` | `regression`, `tip` | ⚠️ Scaffold — braucht testIDs auf Spielplan-Match-Cards + Tip-Stepper |

## Stable Selectors — Konvention

Wir nutzen **`testID`-Props** (nicht `accessibilityLabel`), weil testIDs sich nicht durch Übersetzungen oder Copy-Änderungen verschieben.

Naming-Schema: `<screen>-<element>-<role>`.

Beispiele (in `app/login.tsx`):

| testID | Element |
|---|---|
| `login-email-input` | E-Mail-`TextInput` |
| `login-password-input` | Passwort-`TextInput` |
| `login-terms-checkbox` | AGB-`Pressable` (nur Sign-Up) |
| `login-submit-button` | Haupt-CTA-`Button` |
| `login-switch-mode` | "Jetzt registrieren ›" / "Einloggen ›"-Link |
| `login-forgot-password` | "Passwort vergessen?"-Link |
| `set-username-input` | Username-`TextInput` auf `/set-username` |
| `set-username-submit` | "Weiter"-CTA auf `/set-username` |
| `set-username-signout` | "Abmelden"-Link auf `/set-username` |

**Bevor du einen neuen Flow schreibst:** prüfe ob die nötigen testIDs schon existieren — sonst füg sie zuerst zum Screen hinzu.

## CI-Integration (TODO)

Ziel: Smoke-Suite läuft auf jedem Push gegen `main`. Optionen:

1. **Maestro Cloud** — `maestro cloud --apiKey=$MAESTRO_API_KEY .maestro/` aus GitHub Actions. Free-Tier reicht für 1–2 Pushes/Tag.
2. **GitHub Actions + Android-Emulator** (free runners) — komplexer (Emulator-Cold-Start ~3 Min), aber kostenlos.

Für jetzt: lokal vor jedem Push laufen lassen.

## Troubleshooting

- **🪤 `inputText` "succeeded" aber Felder bleiben leer / `openLink` mit leerer URL** → Du hast `env:` mit leeren String-Defaults im Flow-File. Maestro wendet die YAML-`env:`-Werte **nach** den CLI-`-e`-Args an, sodass die leeren Strings die echten Werte überschreiben. **Fix:** `env:` Block komplett rauswerfen, `${VAR}` direkt referenzieren, CLI-Args via `-e` übergeben.
- **`Element not found: id="login-..."`** → Du läufst gegen einen alten Build, in dem die testIDs noch nicht drin sind. `npm start --reset-cache` oder rebuild.
- **`assertVisible: "Home"` schlägt fehl** → User landet vermutlich auf `/set-username` (Username-Setup) oder `/onboarding` statt direkt auf der Tab-Bar. Check ob das Onboarding-Flag bei `clearState: true` korrekt zurückgesetzt wird (AsyncStorage wird mit `clearState` gewipt — sollte gehen).
- **Flow hängt beim "Splash-Screen"** → Custom Fonts werden geladen. Erhöh den Timeout im ersten `assertVisible`: z. B. `timeout: 30000`.
- **iOS-Simulator: "App not installed"** → `appId` in den Flow-Files muss zum Bundle-Identifier (`de.bolzify.app`) passen. In Expo Go ist der Bundle-ID anders (`host.exp.Exponent`) — siehe nächster Abschnitt.

### Maestro mit Expo Go (statt EAS-Build)

Wenn du noch keinen Dev-Build hast und gegen Expo Go testen willst, ändere temporär `appId` in den Flow-Files:

- iOS: `host.exp.Exponent`
- Android: `host.exp.exponent`

…und ersetze `launchApp` durch:

```yaml
- launchApp:
    appId: "host.exp.Exponent"
- openLink: "exp://192.168.X.X:8081"   # die IP/Port aus `npm start`
```

**Empfehlung:** Sobald der EAS Dev-Build steht (siehe `docs/eas-setup.md`), zurück zur sauberen `de.bolzify.app`-Konfig.

## Roadmap

- [x] Auth-Smoke (Sign-In) und Auth-Regression (Sign-Up + Validation) — **Flow geschrieben, lokaler Run blockt** (siehe Known Issues)
- [ ] Tip-Submit Flow (braucht testIDs auf Match-Cards + Stepper)
- [ ] Liga-Erstellen + per Code beitreten Flow
- [ ] Sondertipps-Flow (Speichern + Lock nach Deadline)
- [ ] Profil-Edit Flow (Username + Avatar)
- [ ] Logout Flow
- [ ] Unit-Tests für `lib/format.ts`, `lib/invite.ts`, `lib/current-tournament.ts` (Vitest)
- [ ] PG-TAP Tests für `score_match()` und `score_special_tips()` RPCs
- [ ] CI-Pipeline (Maestro Cloud oder Android-Emulator auf GitHub Actions)

## Aktueller Status & Known Issues

**Stand 2026-05-04:** Die komplette Infrastruktur ist gebaut und committet:

- ✅ `.maestro/`-Verzeichnis mit Workspace-Config + 5 Flows (signin, signup, validation, tip-submit-scaffold, signin-native, signin-expogo)
- ✅ testIDs in `app/login.tsx` für alle Auth-Felder + CTA + Switch-Link
- ✅ Diese Setup-Doku
- ✅ npm-Scripts (`test:e2e`, `test:e2e:smoke`, `test:e2e:studio`)
- ✅ EAS Dev-Build erfolgreich gebaut + auf Android-Emulator installiert (Bolzify läuft nativ als `de.bolzify.app`)

**Was nicht klappt:** Maestro 2.5.1 auf Windows + Android-Studio-Emulator + Bolzify (sowohl Expo Go als auch native Dev-Build) hat reproduzierbare Driver-Probleme:

1. **`gRPC INTERNAL: Illegal character (U+0)`** beim `viewHierarchy`-Call gegen Expo Go — Surrogate-Pair-Emojis (`✉ 🔒 ★`) im Accessibility-Tree sind die wahrscheinliche Ursache.
2. **`gRPC UNAVAILABLE / tcp:7001 closed`** beim `deviceInfo`-Call gegen native Build — Maestros Driver-Prozess auf dem Emulator ist nicht erreichbar, ADB-Restart hilft nicht zuverlässig.
3. **ADB-Hänger** nach mehrfachem Tool-Wechsel (Maestro + EAS + Android Studio konkurrieren um adbd) — `adb shell pm list packages` blockt eine ganze PowerShell-Session.

**Diagnose:** Liegt nicht an unserer Konfiguration. Ist eine Maestro-Stabilitätsfrage in dieser konkreten Toolchain-Kombination.

### Empfohlene nächste Schritte

In Reihenfolge der Erfolgsaussicht:

1. **🥇 Maestro Cloud** (~30 Min Setup) — `maestro cloud --apiKey=$MAESTRO_API_KEY .maestro/`. Deren Devices haben den Driver pre-konfiguriert, du uploadest nur APK + Flows. Kostenfreies Tier für 1–2 Pushes/Tag reicht. Vermutlich grünt der Smoke beim ersten Try.
2. **🥈 Maestro 1.39.x downgraden** (~10 Min) — bekannt stabiler für RN-Android: `scoop install maestro@1.39.13`. Lohnt nur falls Cloud nicht in Frage kommt.
3. **🥉 Auf Detox umsteigen** (~3–4h Setup) — etablierter für RN, mehr Code aber stabilere Foundation. Braucht EAS Dev-Build (haben wir jetzt). Empfohlene Wahl falls Maestro auch in der Cloud zickt.

### Was beim nächsten Anlauf direkt nutzbar ist

Egal welche Option du wählst — das ist alles bleibend wertvoll:

- Die **Flow-YAMLs** sind syntaktisch korrekt und nutzen die richtigen Selektoren (Placeholder-Text statt testID, weil Maestro testIDs auf RN-Android unzuverlässig propagiert).
- Die **testIDs** in `login.tsx` funktionieren auch für Detox direkt (Detox findet via testID nativ).
- Die **defensiven Sub-Flows** (Username-Setup, Onboarding wegklicken) sind sauber strukturiert mit `runFlow + when:visible`.
- Der **EAS Dev-Build** ist sowieso Critical-Path für TestFlight ab Mitte Mai. Den haben wir nebenbei jetzt schon.
