# Bolzify — Brand-System

**Stand:** Mai 2026 · Logomark-Refresh v1 (Direction "01 Stadion")

---

## TL;DR

- **App-Name:** Bolzify (unverändert in app.json, Stores, Domains, Memory)
- **Visuelle Marke:** **Bolz.** — Wortmarke mit Anstoßkreis-Punkt
- **Brand-Farbe:** Bolzplatz-Grün `#15803D` (light) / `#22C55E` (dark)
- **Font:** Familjen Grotesk 700 Bold (Google Font)

Source-Handoff vom Designer: [`assets/brand/bolz-v1/README-handoff.md`](../assets/brand/bolz-v1/README-handoff.md)

---

## In-App-Verwendung

```tsx
import { BolzLogo } from '@/components/ui/bolz-logo';

// Brand-Variante (grünes Plate, helles Wordmark) — Login, Splash, Heroes
<BolzLogo size={44} variant="brand" />

// Light-Variante (Paper-Plate, dunkles Wordmark) — auf hellen Surfaces
<BolzLogo size={32} variant="light" />

// Dark-Variante (OLED-Plate, helles Wordmark) — Dark-Surfaces
<BolzLogo size={32} variant="dark" />

// Mono-Variante (Tor-Orange auf Ink-Plate) — Sondertipp/Streak-Akzent
<BolzLogo size={28} variant="mono" />

// Inline ohne Plate (z. B. in Body-Copy)
<BolzLogo size={18} variant="light" inline />
```

Größen-Empfehlungen:

| Size | Anwendung                 |
| ---- | ------------------------- |
| 18   | Tab-Bar · Mini-Brand      |
| 24   | App-Header                |
| 36   | Inline · Body Hero        |
| 44   | Auth-Screen Brand         |
| 64   | Splash · Empty-State      |

**< 14px:** Auf das Single-Letter-Mark "B" wechseln (Favicon-Variante).

---

## Brand-Asset-Generierung

App-Icon, Splash-Icon, Favicon und Adaptive-Icon-Komponenten werden aus den
Source-SVGs in [`assets/brand/bolz-v1/`](../assets/brand/bolz-v1/) generiert.

### Setup (einmalig)

```sh
npm install --save-dev sharp
```

`sharp` braucht eine native Binary, ist aber auf Windows / macOS / Linux
unkompliziert installierbar.

### Run

```sh
npm run brand:assets
```

Generiert die folgenden PNGs nach `assets/images/`:

| Output                              | Size           | Source-SVG                          |
| ----------------------------------- | -------------- | ----------------------------------- |
| `icon.png`                          | 1024×1024      | `bolz-app-icon-1024-brand.svg`      |
| `android-icon-foreground.png`       | 1024×1024      | `bolz-android-foreground.svg`       |
| `android-icon-background.png`       | 1024×1024      | `bolz-android-background.svg`       |
| `android-icon-monochrome.png`       | 1024×1024      | `bolz-android-foreground.svg` (white) |
| `splash-icon.png`                   | 1024-wide      | `bolz-light-transparent.svg`        |
| `splash-icon-dark.png`              | 1024-wide      | `bolz-dark-transparent.svg`         |
| `favicon.png`                       | 96×96          | `favicon-128.svg`                   |

Das Skript embedded Familjen Grotesk 700 Bold als base64 ins SVG, bevor
`sharp` rastert — keine extern installierten Fonts nötig, vollständig
reproduzierbar.

### Nach Asset-Update

```sh
# EAS Dev Build neu builden, damit die neuen Icons im Emulator/Device sichtbar sind
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

---

## Farb-Tokens

| Anwendung       | Hintergrund | Wordmark   | Akzent (Punkt) |
| --------------- | ----------- | ---------- | -------------- |
| Light · Paper   | `#F4F1EA`   | `#0E1A12`  | `#15803D`      |
| Brand · Grün    | `#15803D`   | `#F4F1EA`  | `#F4F1EA`      |
| Dark · OLED     | `#06090A`   | `#ECF1F0`  | `#22C55E`      |
| Mono · Orange   | `#0E1A12`   | `#E8744E`  | `#E8744E`      |

Diese matchen 1:1 mit den `Colors`-Tokens aus `constants/design.ts`.

---

## Konstruktion (em-relativ)

| Element              | Wert               |
| -------------------- | ------------------ |
| Wordmark Font        | Familjen Grotesk · 700 Bold |
| Letter-spacing       | -0.052 em          |
| Ring · Outer-D       | 0.21 em            |
| Ring · Stroke        | 0.038 em           |
| Mittelpunkt · D      | 0.06 em            |
| Gap z → Punkt        | 0.06 em            |
| Vertikal-Achse       | Baseline + 0.04 em |
| Plate · Padding-X    | 0.5 em             |
| Plate · Padding-Y    | 0.4 em             |
| Plate · Border-Radius | 0.22 em           |

**Hinweis Familjen Grotesk:** Der Designer-Mock spezifiziert weight 800 — die
Google-Font-Distribution endet aber bei 700 Bold. Wir nutzen 700 als robusten
Fallback (visuell minimal weniger fett, konsistent mit dem Rest der App).

---

## Don'ts

- Punkt nicht voll füllen (verliert Spielfeld-Symbol — Anstoßkreis-Optik bricht)
- Wordmark nicht stretchen oder schrägstellen
- Kein Outline-Stroke auf der Wordmark
- Kein Drop-Shadow auf dem Logo (außer Plate-Container im UI)
- Variante "mono" nicht mit anderen Brand-Akzenten mischen

---

## Versionierung

`assets/brand/bolz-v1/` — V1 (aktuell). Bei späteren Logo-Iterationen einen
neuen Ordner `bolz-v2/` anlegen, das Generator-Skript auf die neue Version
umstellen, und alte Source-SVGs zur Historie behalten.
