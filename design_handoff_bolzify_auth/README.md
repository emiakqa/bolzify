# Handoff: Bolzify Auth — Login + Registrierung

## Overview

Redesign der bestehenden Login- und Registrierungsmaske im neuen **Bolzplatz**-Design (siehe Haupt-Handoff `design_handoff_bolzify/`). Beibehaltung der vertikalen Komposition aus v0.16 (Logo → Subtitle → Felder → CTA → Switch-Link), aber komplett neu typografiert, mit Wappen-Logo, Pill-Inputs, Mono-Caps-Labels und Tor-Orange-Akzent.

Zwei Screens × zwei Schemes = 4 Mockups.

## About the Design Files

Die Datei `bolzplatz/screen-auth.jsx` ist eine **Design-Referenz in HTML/React (über Babel-Standalone)** — kein Production-Code zum 1:1-Kopieren. Aufgabe ist, die Screens **in der bestehenden Codebase nachzubauen** (vermutlich React Native — die Primitives sind portierbar via `div`→`View`, `span`→`Text`).

Tokens kommen aus `bolzplatz/tokens.jsx` und sind die Source of Truth für Farben, Typo, Spacing, Radius, Shadow.

## Fidelity

**High-fidelity (hifi).** Pixel-genaue Mockups. Bitte nicht "vereinfachen" — die Wahl von Pill-Buttons, Mono-Caps-Labels über Inputs und der Wortmarken-Treatment sind bewusste Design-Entscheidungen für die ganze App.

## Screens

### Login

**Zweck**: User mit bestehender E-Mail/Passwort-Kombi einloggen.

**Aufbau** (von oben nach unten, 60px Top-Padding, 40px Bottom-Padding, 24px Horizontal-Padding):

1. **Top-Kicker** — `"ANPFIFF IN KÜRZE"`, JetBrains Mono 10px / 700 / letter-spacing 1.6 / textFaint, zentriert.
2. **Brand Mark** (36px Margin-Top):
   - Wappen-Disc 84×84, `border-radius: 999`, Linear-Gradient `accent → accentHover` 160°, `shadowMd`. Innen: "B" in Familjen Grotesk 800 / 44px / accentFg / letter-spacing -2.
   - **Tor-Orange Stern-Badge** unten rechts: 26×26 Pill, bg `warm`, fg `warmFg`, 11px Mono "★", 2px-Border in `bg`-Farbe (sitzt halb über dem Disc).
   - Wortmarke "Bolzify": Familjen Grotesk 800 / 44px / letter-spacing -1.6 / `text`.
   - Untermarke `"— TIPPRUNDE · SAISON 26 —"`: Mono 10px / 700 / letter-spacing 1.6 / Caps / `textMuted`, mit zwei 18×1px Linien als Trenner links/rechts.
3. **Headline-Block** (28px Margin-Top, 28px Margin-Bottom):
   - `"Willkommen zurück."` — Familjen Grotesk 800 / 28px / letter-spacing -0.8 / `text`.
   - Sub `"Tipp deine Spiele und sieh, wer in deiner Liga vorne liegt."` — Geist 14px / `textMuted`, max-width 280px, zentriert.
4. **Felder** (gap 14):
   - **E-Mail**: Caps-Mono-Label `"E-MAIL"`, dann Pill-Input (siehe Field-Spec unten), Icon `✉`, Placeholder `"anna.b@bolzify.de"`.
   - **Passwort**: Label `"PASSWORT"`, Icon `🔒`, type=password, Placeholder `"••••••••"`.
   - **"Passwort vergessen?"** — Geist 13 / `textMuted`, rechtsbündig, gap -2 zum Feld.
5. **CTA** (18px Margin-Top): `"Einloggen"`, full-width Pill 56px, `accent` bg, Familjen Grotesk 700 / 17px / -0.2 letter-spacing, `shadowSm`.
6. **Switch-Link** (18px Margin-Top): `"Noch kein Konto?"` (`textMuted`) + `"Jetzt registrieren ›"` (`accent` / 700), Geist 14px, zentriert.
7. **Footer** (am unteren Rand): `"BOLZIFY v0.17 · MADE FÜR DEN BOLZPLATZ"` — Mono 10 / 600 / Caps / `textFaint`.

### Registrierung

**Zweck**: Neuen User anlegen.

Gleicher Aufbau wie Login mit folgenden Unterschieden:

- **Top-Kicker**: `"NEU HIER"`.
- **Headline**: `"Konto anlegen."` + Sub `"Username, Mail, Passwort — und du tippst in deiner ersten Liga mit."`.
- **Drei Felder** statt zwei: Username (Icon `@`, Placeholder `"@anna_b"`) + E-Mail + Passwort (Placeholder `"min. 8 Zeichen"`).
- **AGB-Checkbox** statt "Passwort vergessen?":
  - 20×20 Square, `border-radius: 6`, `accent` bg, 12px ✓-Glyph in `accentFg`.
  - Text rechts: Geist 12 / `textMuted` / line-height 1.5: `"Ich akzeptiere die <strong>AGB</strong> und <strong>Datenschutzerklärung</strong>."` — Bold-Begriffe in `text` / 600.
- **CTA**: `"Registrieren"`.
- **Switch-Link**: `"Schon ein Konto?"` + `"Einloggen ›"`.
- **Footer**: `"KEINE WERBUNG · KEIN ECHTGELD · NUR EHRE"`.

## Field-Spec (Pill-Input, 56px)

```
Container:
  display: flex; align-items: center; gap: 10px;
  background: t.surface;
  border: 1px solid t.border;
  border-radius: 16;
  padding: 0 16px;
  height: 56;
  box-shadow: t.shadowSm;

Icon (optional):
  font-size: 16; color: t.textMuted; width: 18px; text-align: center;

Input:
  flex: 1; border: none; outline: none; background: transparent;
  font-family: Geist; font-size: 16; font-weight: 500;
  color: t.text; letter-spacing: -0.1;

Label (über dem Feld):
  font-family: JetBrains Mono; font-size: 10; font-weight: 700;
  letter-spacing: 1.4; text-transform: uppercase;
  color: t.textMuted; padding-left: 4;
  gap zum Container: 6px;
```

## Interactions & Behavior (nicht in Mockups ausgespielt)

- **Input Focus**: Border-Color → `t.accent`, `box-shadow` bleibt `shadowSm`. 150ms ease.
- **Validation**:
  - E-Mail: client-side regex on blur, bei Fehler Border `t.danger` + Help-Text 12px in `t.danger` unterhalb.
  - Passwort (Register): min. 8 Zeichen — Live-Counter 12px Mono rechts unter Feld in `textMuted`, bei < 8 in `danger`.
  - Username: Live-Verfügbarkeitscheck (debounced 400ms), grünes ✓ rechts im Feld bei verfügbar, `danger` × bei vergeben.
- **CTA Loading**: Label durch Spinner ersetzen (16×16, fg-Farbe), Button bleibt klickbar=false.
- **CTA Disabled**: opacity 0.4, kein Schatten.
- **AGB-Checkbox** (Register): default ON in den Mockups, **muss aber im Production-State default OFF** sein. Tap toggelt — bei OFF: bg transparent, 1.5px Border `borderStrong`. CTA disabled solange OFF.
- **"Passwort vergessen?"** → Push zu Forgot-Password-Flow (nicht in diesem Bundle, separat zu designen).
- **Switch-Link** → Push/Replace zur jeweils anderen Maske, 220ms slide-Animation horizontal.
- **Submit**: optimistic — bei Erfolg replace zur Home, bei Fehler Toast mit `danger`-bg, 3s auto-dismiss, Felder bleiben befüllt.
- **Keyboard**: E-Mail-Feld nutzt `keyboardType="email-address" autoCapitalize="none"`, Username `autoCapitalize="none"`, Passwort `secureTextEntry`.

## Tokens — verwendet in diesen Screens

Aus `bolzplatz/tokens.jsx`:

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F4F1EA` (paper100) | `#06090A` (night950) | Screen-Background |
| `surface` | `#FFFFFF` | `#0E1416` | Field-Background |
| `text` | `#0E1A12` | `#ECF1F0` | Headline + Wortmarke + Input-Wert |
| `textMuted` | `#5C6B62` | `#7A8A86` | Sub, Labels, Switch-Prompt |
| `textFaint` | `#9AA89F` | `#4F5C58` | Top-Kicker, Footer |
| `border` | `rgba(15,30,20,0.06)` | `rgba(255,255,255,0.06)` | Field-Border |
| `borderStrong` | `rgba(15,30,20,0.12)` | `rgba(255,255,255,0.14)` | Untermarken-Trenner |
| `accent` | `#15803D` (green700) | `#22C55E` (green500) | Wappen-Disc, CTA, Switch-Link |
| `accentFg` | `#FFFFFE` | `#062611` | Wortmarke "B", CTA-Label, ✓ |
| `accentHover` | `#16A34A` | `#4ADE80` | Wappen-Gradient-Endpunkt |
| `warm` | `#E8744E` (orange500) | `#E8744E` | Stern-Badge bg |
| `warmFg` | `#FFFFFE` | `#1A0F00` | Stern-Glyph |
| `shadowSm` | siehe tokens | siehe tokens | Field + CTA |
| `shadowMd` | siehe tokens | siehe tokens | Wappen-Disc |

## Fonts

```
Display: 'Familjen Grotesk', 700/800
Body:    'Geist', 400/500/600/700
Mono:    'JetBrains Mono', 600/700
```

Alle drei via Google Fonts. Im RN-Build: Expo-Font / `react-native-google-fonts`.

## State Management

```ts
type AuthForm = {
  email: string;
  password: string;
  username?: string;       // nur Register
  acceptTerms?: boolean;   // nur Register
};

type AuthState = 'idle' | 'submitting' | 'error';
```

Auf Submit-Success: JWT speichern, replace Navigator-Stack zur Home.

## Files in diesem Bundle

```
bolzplatz/
  screen-auth.jsx        ← LoginScreen + RegisterScreen + BrandMark + Field + AuthShell
  tokens.jsx             ← Token-Source-of-Truth (Light + Dark)
  primitives.jsx         ← Card, Button, Badge, … (für Kontext mit Rest der App)

ios-frame.jsx            ← iPhone-Bezel (nur für die HTML-Preview)
preview.html             ← Lauffähige Vorschau aller 4 Screens, einfach im Browser öffnen
README.md                ← diese Datei

screenshots/
  auth-overview.png      ← Alle 4 Screens nebeneinander
  01-login-light.png     ← Login Light
  02-register-light.png  ← Registrierung Light
  03-login-dark.png      ← Login Dark
  04-register-dark.png   ← Registrierung Dark
```

## Open Questions

1. **Forgot-Password-Flow**: Soll separat designt werden — bitte vor Implementation klären, ob Magic-Link oder Code-via-Mail oder klassisches Reset-Form.
2. **Social Login** (Apple / Google)? Aktuell **nicht** in den Mockups. Falls gewünscht: zwischen CTA und Switch-Link einbauen, mit "ODER" Divider.
3. **Username-Charset**: Aktuell mit `@` Prefix in der UI — ist das eine reine Anzeige-Sache oder muss der User das `@` mittippen? Default-Annahme: Anzeige.
4. **Onboarding nach Register**: Kein Schritt enthalten ("Erste Liga beitreten" o.ä.). Bitte separat klären.
