#!/usr/bin/env node
// Bolzify · generate-brand-assets
// ────────────────────────────────────────────────────────────────────────────
// Generiert App-Icon, Splash, Favicon und Adaptive-Icon-Komponenten als PNGs.
//
// Setup (einmalig):
//   npm install --save-dev @resvg/resvg-js opentype.js
//
// Run:
//   npm run brand:assets
//   # oder direkt:
//   node scripts/generate-brand-assets.mjs
//
// Architektur:
//   1. Lädt Familjen Grotesk 700 Bold TTF mit opentype.js
//   2. Misst exakte Glyph-Breiten für "Bolz" / "B"
//   3. Generiert SVGs from-scratch: Wordmark als <path>-Outlines (kein
//      Font-Rendering-Risk), plus zwei <circle> für den Anstoßkreis-Punkt
//   4. resvg-js rastert die SVGs zu PNGs in den Zielgrößen
//
// Warum from-scratch (statt Handoff-SVGs zu patchen):
//   Die Handoff-SVGs sind hardcoded auf eine bestimmte Glyph-Breite kalibriert.
//   Familjen Grotesk 700 (was wir nutzen — 800 gibt's in Google Fonts nicht)
//   ist breiter, sodass der Wordmark mit dem Punkt kollidiert. Eigene SVG-
//   Generation mit opentype-gemessener Breite löst das robust.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Lazy-loads mit hilfreicher Fehlermeldung ──────────────────────────────
let Resvg;
let opentype;
try {
  ({ Resvg } = await import('@resvg/resvg-js'));
  opentype = (await import('opentype.js')).default;
} catch (err) {
  console.error(
    '\n✗ Dependency fehlt. Setup einmalig:\n' +
      '    npm install --save-dev @resvg/resvg-js opentype.js\n' +
      `\n  Detail: ${err.message}\n`,
  );
  process.exit(1);
}

// ─── Familjen Grotesk 700 Bold laden ───────────────────────────────────────
const FONT_PATH = resolve(
  ROOT,
  'node_modules/@expo-google-fonts/familjen-grotesk/700Bold/FamiljenGrotesk_700Bold.ttf',
);
let font;
try {
  font = opentype.parse((await readFile(FONT_PATH)).buffer);
} catch (err) {
  console.error(`\n✗ Familjen Grotesk laden fehlgeschlagen: ${FONT_PATH}`);
  console.error(`  ${err.message}\n`);
  process.exit(1);
}

const UPM = font.unitsPerEm; // typically 1000 für Familjen Grotesk
// Cap-Height aus dem "B"-Glyph messen (statt OS/2-table zu trauen)
const bBbox = font.charToGlyph('B').getBoundingBox();
const CAP_HEIGHT_RATIO = (bBbox.y2 - bBbox.y1) / UPM; // ~0.72 für Familjen Grotesk Bold

// ─── SVG-Generator-Helpers ─────────────────────────────────────────────────

function num(n) {
  return n.toFixed(2);
}

/** Misst die Wordmark-Breite ohne path-Generation. */
function measureWordmark(text, fontSize) {
  const letterSpacing = -fontSize * 0.052;
  const ratio = fontSize / UPM;
  let cursor = 0;
  for (const ch of text) {
    cursor += font.charToGlyph(ch).advanceWidth * ratio + letterSpacing;
  }
  return cursor - letterSpacing;
}

/** Baut SVG-path-data mit ABSOLUT positionierten Glyphen (kein transform nötig). */
function buildWordmarkPath(text, fontSize, x0, baselineY) {
  const letterSpacing = -fontSize * 0.052;
  const ratio = fontSize / UPM;
  let cursor = x0;
  let pathData = '';
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    pathData += glyph.getPath(cursor, baselineY, fontSize).toPathData(3);
    cursor += glyph.advanceWidth * ratio + letterSpacing;
  }
  return pathData;
}

/**
 * Wordmark "Bolz." (Wordmark + Anstoßkreis-Punkt) als komplettes SVG.
 *
 * @param {object} opts
 * @param {number} opts.size — fontSize in px
 * @param {string} opts.fg — Wordmark-Farbe
 * @param {string} opts.accent — Punkt-Farbe
 * @param {string|null} opts.plate — Plate-BG-Farbe (null = transparent)
 * @param {number} [opts.plateRadius] — Squircle-Radius (default: 0.22 * size)
 * @param {number} [opts.padding] — horizontales Padding in em (default 0.5)
 * @param {number} [opts.vertPadding] — vertikales Padding in em (default 0.4)
 * @param {number} [opts.viewBoxW] — fixe viewBox-Breite (z. B. 1024 für quadr. Icon)
 * @param {number} [opts.viewBoxH] — fixe viewBox-Höhe
 */
function bolzSvg({
  size,
  fg,
  accent,
  plate,
  plateRadius,
  padding = 0.5,
  vertPadding = 0.4,
  viewBoxW,
  viewBoxH,
}) {
  // Schritt 1: Wordmark-Breite messen (für Plate-Dimensionierung & Punkt-Position)
  const wordmarkW = measureWordmark('Bolz', size);

  // Punkt-Maße (em-relativ, exakt aus tokens.json)
  const dotOuterD = size * 0.21;
  const dotStroke = Math.max(2, size * 0.038);
  const dotInner = Math.max(1.5, size * 0.06);
  const dotGap = size * 0.06;
  const dotOuterR = dotOuterD / 2;

  const contentWidth = wordmarkW + dotGap + dotOuterD;

  const plateW = viewBoxW ?? contentWidth + 2 * padding * size;
  const plateH = viewBoxH ?? size + 2 * vertPadding * size;

  // Content horizontal zentrieren
  const contentX = (plateW - contentWidth) / 2;

  // Vertikales Centering: baseline so positionieren, dass Wordmark optisch mittig
  // sitzt (cap-Height/2 oberhalb der Geometrie-Mitte).
  const baselineY = plateH / 2 + (size * CAP_HEIGHT_RATIO) / 2;

  // Schritt 2: Path-Daten mit ABSOLUT positionierten Glyphen bauen
  const wordmarkPath = buildWordmarkPath('Bolz', size, contentX, baselineY);

  // Punkt-Position: rechts vom Wordmark-Ende, vertikal etwas oberhalb der
  // Baseline (visuell auf Mid-X-Height-Höhe). Empirisch aus Handoff: ~0.145em.
  const dotCx = contentX + wordmarkW + dotGap + dotOuterR;
  const dotCy = baselineY - size * 0.145;

  const plateRect = plate
    ? `<rect width="${num(plateW)}" height="${num(plateH)}" rx="${num(plateRadius ?? size * 0.22)}" ry="${num(plateRadius ?? size * 0.22)}" fill="${plate}"/>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(plateW)} ${num(plateH)}" width="${num(plateW)}" height="${num(plateH)}">` +
    plateRect +
    `<path d="${wordmarkPath}" fill="${fg}"/>` +
    `<circle cx="${num(dotCx)}" cy="${num(dotCy)}" r="${num(dotOuterR)}" fill="none" stroke="${accent}" stroke-width="${num(dotStroke)}"/>` +
    `<circle cx="${num(dotCx)}" cy="${num(dotCy)}" r="${num(dotInner / 2)}" fill="${accent}"/>` +
    `</svg>`
  );
}

/** Single-letter "B" auf Squircle (Favicon). */
function bSvg({ size, fg, plate, plateRadius }) {
  const fontSize = size * 0.66; // großzügig zentriert
  const ratio = fontSize / UPM;
  const glyph = font.charToGlyph('B');
  const advance = glyph.advanceWidth * ratio;

  const x = (size - advance) / 2;
  const baselineY = size / 2 + (fontSize * CAP_HEIGHT_RATIO) / 2;

  const pathData = glyph.getPath(x, baselineY, fontSize).toPathData(3);

  const plateRect = plate
    ? `<rect width="${size}" height="${size}" rx="${num(plateRadius)}" ry="${num(plateRadius)}" fill="${plate}"/>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    plateRect +
    `<path d="${pathData}" fill="${fg}"/>` +
    `</svg>`
  );
}

/** Solid-color Square (Adaptive Background). */
function solidSvg({ size, color }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${color}"/></svg>`;
}

// ─── PNG-Render via resvg ──────────────────────────────────────────────────
async function svgToPng(svg, outRel, fitWidth) {
  const outPath = resolve(ROOT, outRel);
  await mkdir(dirname(outPath), { recursive: true });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: fitWidth },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render();
  await writeFile(outPath, png.asPng());
  console.log(`  ✓ ${outRel} (${png.width}×${png.height})`);
}

// ─── Build-Targets ─────────────────────────────────────────────────────────
async function build() {
  console.log('Generating brand assets …\n');

  // 1. iOS App-Icon (1024×1024) — brand variant: grünes Squircle, helles Wordmark.
  //    Squircle radius = width × 0.235 (laut Handoff-Designer).
  await svgToPng(
    bolzSvg({
      size: 360,
      fg: '#F4F1EA',
      accent: '#F4F1EA',
      plate: '#15803D',
      plateRadius: 240.64,
      viewBoxW: 1024,
      viewBoxH: 1024,
    }),
    'assets/images/icon.png',
    1024,
  );

  // 2. Android Adaptive Foreground (1024×1024) — Wordmark transparent,
  //    skaliert auf "safe area" (innere 66 % des Icons werden nie geclippt).
  await svgToPng(
    bolzSvg({
      size: 280,
      fg: '#F4F1EA',
      accent: '#F4F1EA',
      plate: null,
      viewBoxW: 1024,
      viewBoxH: 1024,
    }),
    'assets/images/android-icon-foreground.png',
    1024,
  );

  // 3. Android Adaptive Background (1024×1024) — solides Brand-Grün.
  await svgToPng(
    solidSvg({ size: 1024, color: '#15803D' }),
    'assets/images/android-icon-background.png',
    1024,
  );

  // 4. Android Themed Monochrome (1024×1024) — Wordmark in pure white,
  //    transparenter Background. Für Android 13+ Themed Icons.
  await svgToPng(
    bolzSvg({
      size: 280,
      fg: '#FFFFFF',
      accent: '#FFFFFF',
      plate: null,
      viewBoxW: 1024,
      viewBoxH: 1024,
    }),
    'assets/images/android-icon-monochrome.png',
    1024,
  );

  // 5. Splash light — dunkles Wordmark transparent. Background paper aus
  //    app.json::splashScreen::backgroundColor (#F4F1EA).
  await svgToPng(
    bolzSvg({
      size: 280,
      fg: '#0E1A12',
      accent: '#15803D',
      plate: null,
      padding: 0.3,
      vertPadding: 0.3,
    }),
    'assets/images/splash-icon.png',
    1024,
  );

  // 6. Splash dark — helles Wordmark transparent. BG OLED #06090A.
  await svgToPng(
    bolzSvg({
      size: 280,
      fg: '#ECF1F0',
      accent: '#22C55E',
      plate: null,
      padding: 0.3,
      vertPadding: 0.3,
    }),
    'assets/images/splash-icon-dark.png',
    1024,
  );

  // 7. Web-Favicon (96×96) — Single-Letter "B" auf grünem Squircle.
  //    Radius matches handoff: size × 0.22.
  await svgToPng(
    bSvg({
      size: 96,
      fg: '#F4F1EA',
      plate: '#15803D',
      plateRadius: 21.12,
    }),
    'assets/images/favicon.png',
    96,
  );

  console.log('\n✓ Done. Rebuild EAS Dev Build, um die neuen Icons zu sehen:');
  console.log('  npx eas-cli@latest build --profile development --platform android');
}

build().catch((err) => {
  console.error('\n✗ generate-brand-assets failed:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
});
