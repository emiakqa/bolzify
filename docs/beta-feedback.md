# Bolzify — Beta-Feedback & Review-Notizen

Sammelpunkt für Feedback aus TestFlight-Beta, eigenen Tests und Reviews.
Punkte werden hier gesammelt, geprüft, geplant und nach Umsetzung in CHANGELOG/Commit-Message verschoben.

Status-Legende:
- 🟡 offen — noch nicht angefasst
- 🟠 in Arbeit
- 🟢 umgesetzt (mit Commit/Version)
- ⚪ wontfix / verschoben (mit Begründung)

---

## Aus User-Review — 07.05.2026

### 1. 🟡 Tippen ohne Liga-Mitgliedschaft sperren
**Problem:** Aktuell kann ein User Tipps abgeben, auch wenn er in keiner Liga Mitglied ist. Das ist sinnlos — Tipps brauchen einen Kontext (Liga), in dem sie zählen. Sonst sammeln sie sich ins Leere.

**Soll:** Tippen ist nur möglich, wenn der User in **mindestens einer Liga** ist. Tipps sollten **pro Liga** abgegeben werden können (nicht ein globaler Tipp, der überall zählt — sondern pro Liga ein eigener Tipp möglich).

**Offene Fragen:**
- UX: was zeigen wir, wenn jemand "Tippen" antippt ohne Liga? → wahrscheinlich: Hinweis + CTA "Liga beitreten / erstellen"
- Datenmodell: aktuell ist `tips.user_id + tips.match_id` unique → muss zu `tips.user_id + tips.match_id + tips.league_id` werden. Migration nötig + Backfill für bestehende Tipps (in welche Liga zuordnen?)
- Scoring/Punkte: ändert sich entsprechend — Punkte werden pro Liga gerechnet, nicht global
- Sondertipps: gilt das gleiche? (vermutlich ja — Sondertipp pro Liga)

**Impact:** Groß. Ist eine Architektur-Änderung am Tipp-Modell, nicht nur UI.

---

### 2. 🟢 Username-Wahl nach Registrierung zeigt altes Design *(umgesetzt)*
**Problem:** Nach der Registrierung kommt der Username-Setzen-Screen (`/set-username`). Der hat noch das alte Design, nicht das aktuelle Bolzplatz-System (Familjen Grotesk, Spacing-Tokens, Pill-Inputs).

**Soll:** Auf neues Design refactoren — analog zu `app/login.tsx` (das ist die Referenz für die aktuelle Brand).

**Datei:** `app/set-username.tsx`

**Impact:** Klein. Pure UI-Änderung, keine Logik.

---
