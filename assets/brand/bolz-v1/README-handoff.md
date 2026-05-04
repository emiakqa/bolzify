# Bolz Logo · Handoff

**Direction:** 01 Stadion — Wortmarke mit Anstoßkreis-Punkt
**Variant:** A (mit Punkt) — `Bolz.`
**Stand:** Mai 2026

---

## TL;DR für Claude Code

Logo importieren, Token einbinden, fertig.

```jsx
// React
import { BolzLogo } from "./bolz-logo-handoff/react/BolzLogo";

<BolzLogo size={48} variant="brand" />
```

```html
<!-- Vanilla -->
<script src="/bolz-logo-handoff/web-component/bolz-logo.js"></script>
<bolz-logo size="48" variant="brand"></bolz-logo>
```

```html
<!-- Static SVG -->
<img src="/bolz-logo-handoff/svg/bolz-light.svg" alt="Bolz." height="48">
```

---

## Konstruktion

Alle Maße als Vielfaches von **1 em** (= `font-size`). Skaliert verlustfrei vom Favicon bis zum Plakat.

| Element              | Wert               |
| -------------------- | ------------------ |
| Wordmark Font        | Familjen Grotesk · 800 |
| Letter-spacing       | -0.052 em          |
| Ring · Diameter      | 0.21 em            |
| Ring · Stroke        | 0.038 em           |
| Mittelpunkt          | 0.06 em            |
| Gap z → Punkt        | 0.06 em            |
| Vertikal-Achse       | Baseline + 0.04 em |

---

## Farb-System

| Anwendung       | Hintergrund | Wordmark   | Akzent (Punkt) |
| --------------- | ----------- | ---------- | -------------- |
| Light · Paper   | `#F4F1EA`   | `#0E1A12`  | `#15803D`      |
| Brand · Grün    | `#15803D`   | `#F4F1EA`  | `#F4F1EA`      |
| Dark · OLED     | `#06090A`   | `#ECF1F0`  | `#22C55E`      |
| Mono · Orange   | `#0E1A12`   | `#E8744E`  | `#E8744E`      |

Tokens als CSS-Variablen + JSON: siehe `tokens/`.

---

## Größen-Empfehlungen

| Pixel-Größe | Anwendung                  | Hinweis                      |
| ----------- | -------------------------- | ---------------------------- |
| 14 px       | Inline · Body Copy         | Punkt bleibt lesbar bei ≥14px |
| 18 px       | Tab-Bar · Mini-Brand       | —                            |
| 24 px       | App-Header                 | Standard im Produkt          |
| 36 px       | Auth-Screen Brand          | —                            |
| 64 px       | Splash / Empty-State       | —                            |
| 120 px      | Marketing · Hero           | —                            |
| 220 px+     | Plakat / OOH               | —                            |

**< 14px:** auf das Favicon-Mark `B` (siehe `favicon/`) wechseln.

---

## App-Icon

Source: `app-icon/bolz-app-icon-1024.svg` (iOS), `bolz-app-icon-512.svg` (Android, Adaptive Icon: das Squircle als Background, Wordmark als Foreground).

iOS Squircle-Radius: `width × 0.235`.
Wordmark-Größe im Squircle: ~42 % der Icon-Breite.

---

## Don'ts

- Punkt nicht voll füllen (verliert Spielfeld-Symbol)
- Wordmark nicht stretchen / schrägstellen
- Kein Outline-Stroke auf der Wordmark
- Kein Drop-Shadow auf dem Logo

---

## Inhalt

```
bolz-logo-handoff/
├─ README.md                  ← du bist hier
├─ react/
│  └─ BolzLogo.jsx            ← drop-in React-Component
├─ web-component/
│  └─ bolz-logo.js            ← <bolz-logo> Custom Element
├─ svg/
│  ├─ bolz-light.svg          ← Wordmark auf Paper
│  ├─ bolz-brand.svg          ← Wordmark auf Brand-Grün
│  ├─ bolz-dark.svg           ← Wordmark auf OLED
│  └─ bolz-mono.svg           ← Wordmark mono · Tor-Orange
├─ app-icon/
│  ├─ bolz-app-icon-1024.svg  ← iOS source (1024×1024)
│  └─ bolz-app-icon-512.svg   ← Android adaptive (512×512)
├─ favicon/
│  ├─ favicon-16.svg
│  ├─ favicon-32.svg
│  ├─ favicon-64.svg
│  └─ favicon-128.svg
└─ tokens/
   ├─ tokens.css              ← :root CSS-Variablen
   └─ tokens.json             ← portable Tokens
```
