# EAS Build Setup — Schritt-für-Schritt

Stand: 2026-04-23 · Ziel: erste Dev-Builds für iOS/Android, danach
Production-Builds für Store-Submission.

## Vor dem ersten Build

1. **Expo-Account einloggen** (einmalig pro Maschine):
   ```bash
   npx eas-cli@latest login
   ```

2. **Projekt mit EAS verknüpfen** (legt `extra.eas.projectId` an):
   ```bash
   npx eas-cli@latest init
   ```
   Danach `app.json` öffnen und die generierte `projectId` an den Stellen
   `[EAS_PROJECT_ID]` einsetzen (zwei Stellen: `extra.eas.projectId` und
   `updates.url`). Der `owner` muss dein Expo-Username sein.

3. **Apple/Google Credentials** generieren lassen (interaktiv, EAS macht das):
   - iOS: braucht aktiven Apple Developer Account. Wenn `eas build` startet,
     fragt es nach Apple-ID, generiert Distribution Certificate +
     Provisioning Profile automatisch.
   - Android: EAS erzeugt Keystore automatisch. **WICHTIG**: nach dem ersten
     Build `npx eas-cli credentials` → "Download keystore" und sicher
     wegspeichern. Verlust = niemals wieder Updates für die App möglich.

## Builds starten

```bash
# Development Build (nutzbar mit Expo Dev Client + Hot Reload)
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile development --platform android

# Internal Preview (TestFlight ready, aber ohne Store-Listing)
npx eas-cli build --profile preview --platform all

# Production (für Store-Submission)
npx eas-cli build --profile production --platform all
```

iOS-Builds dauern 15-25 Min, Android 8-15 Min. Free-Plan: 30 Builds/Monat.

## Store-Submission

```bash
# iOS → App Store Connect (braucht ascAppId in eas.json)
npx eas-cli submit --platform ios --profile production

# Android → Google Play Console (braucht Service Account JSON)
npx eas-cli submit --platform android --profile production
```

### Google Play Service Account anlegen

1. Google Cloud Console → IAM → Service Accounts → Create
2. Name: `bolzify-store-submission`
3. Rolle: `Service Account User`
4. Keys → Add Key → JSON → herunterladen
5. Datei nach `secrets/google-play-service-account.json` (gitignored!)
6. In Play Console: Setup → API access → Service Account verlinken

### Apple App Store Connect

1. App in App Store Connect anlegen, Bundle ID = `de.bolzify.app`
2. SKU vergeben (z.B. `bolzify-de-app`)
3. App-ID notieren — gehört in `eas.json` als `ascAppId`
4. Apple Team ID findest du in developer.apple.com → Membership → Team ID

## Versionierung

`appVersionSource: "remote"` in `eas.json` bedeutet: Version + buildNumber/
versionCode kommen vom EAS-Server, nicht aus `app.json`. Vorteile:
- iOS-Build-Number wird auto-inkrementiert (`autoIncrement: true` im production-Profil)
- Du musst `app.json` nicht bei jedem Build editieren

Wenn du die User-sichtbare Version (`1.0.0` → `1.1.0`) ändern willst:
```bash
npx eas-cli build:version:set --platform ios --version 1.1.0
npx eas-cli build:version:set --platform android --version 1.1.0
```

## OTA-Updates (Expo Updates)

Mit `runtimeVersion: appVersion` werden OTA-Updates **nur an Builds derselben
App-Version** ausgeliefert. Das verhindert Inkompatibilität bei Native-Code-
Änderungen. Updates pushen:
```bash
npx eas-cli update --branch production --message "Beschreibung"
```

## Wichtige Notes

- **Bundle Identifier `de.bolzify.app` ist final** — nach erstem Store-Upload
  nicht mehr änderbar (würde als komplett neue App gelten)
- **Apple verlangt iPad-Support** wenn `supportsTablet: true` (ist gesetzt) —
  beim Submission-Review werden iPad-Screenshots gefordert
- **"Sign in with Apple"** ist Pflicht ab iOS 13 wenn andere Social Logins
  angeboten werden. Aktuell nur E-Mail-Login → noch nicht relevant
