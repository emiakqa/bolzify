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

### 1. 🟢 Tippen ohne Liga-Mitgliedschaft sperren *(umgesetzt 2026-05-08, v0.25, Smoke grün)*
**Problem:** Aktuell kann ein User Tipps abgeben, auch wenn er in keiner Liga Mitglied ist. Das ist sinnlos — Tipps brauchen einen Kontext (Liga), in dem sie zählen. Sonst sammeln sie sich ins Leere.

**Soll:** Tippen ist nur möglich, wenn der User in **mindestens einer Liga** ist. Tipps werden **pro Liga** abgegeben (nicht ein globaler Tipp).

**Umsetzung (2026-05-07):**
- Migration `0016a/b/b2/c/d_per_league_tips_*.sql` — `league_id` auf `tips`, `scored_tips`, `special_tips`, `scored_special_tips`, `group_winner_tips`. Alte Tipps werden gelöscht (fresh start, nur Test-Daten in DB).
- RLS: Insert/Update braucht League-Membership-Check. Read-on-Leaguemates filtert exakt auf gemeinsame Liga (vorher: alle gemeinsamen Ligen).
- Scoring: `score_match` + `score_special_tips` propagieren `league_id` durch.
- App: `lib/active-league.ts` (AsyncStorage), `hooks/use-active-league.ts`, `components/league-picker-bar.tsx`. Tippen-/Home-/My-Tips-/Sondertipp-Screens haben Liga-Picker oben + Empty-State wenn 0 Ligen. Tip-Modal & Sondertipp-Screen haben "Übernehmen"-Button für Tipps aus anderer Liga (One-Tap-Copy).
- Notifications: Reminder feuert wenn Match in *mindestens einer* Liga des Users noch nicht getippt ist. Sondertipp-Reminder verstummt sobald in irgendeiner Liga getippt.

**Erledigt:**
- ~~Migration in Supabase ausführen (a → b → b2 → c → d)~~ ✅ 2026-05-08 durch.
- ~~7-Step-Smoke~~ ✅ 2026-05-08 grün.
- Folge-Bugs aus erster Smoke-Runde (#7 Punkte-Anzeige, #9 Spielplan-Refresh, #10 Special-Tips Stale-Closure) — alle in v0.25 mitgefixt.

**Impact:** Groß. Architektur-Änderung am Tipp-Modell, alle Tipp-related Screens betroffen.

---

### 2. 🟢 Username-Wahl nach Registrierung zeigt altes Design *(umgesetzt)*
**Problem:** Nach der Registrierung kommt der Username-Setzen-Screen (`/set-username`). Der hat noch das alte Design, nicht das aktuelle Bolzplatz-System (Familjen Grotesk, Spacing-Tokens, Pill-Inputs).

**Soll:** Auf neues Design refactoren — analog zu `app/login.tsx` (das ist die Referenz für die aktuelle Brand).

**Datei:** `app/set-username.tsx`

**Impact:** Klein. Pure UI-Änderung, keine Logik.

---

## Aus Tester-Feedback — 08.05.2026

### 3. 🟢 Torschützen-Tipp bei 0:0 sperren *(umgesetzt 2026-05-08)*
**Problem:** User kann gleichzeitig **0:0** als Ergebnis tippen **und** einen ersten Torschützen wählen. Das ist exploitbar: Der Tester argumentiert, man könne damit sein 0:0 "kostenlos absichern" — wenn doch ein Tor fällt, hat man immerhin die Chance auf den Torschützen-Bonus. Das verzerrt die Anreize.

**Soll:** Wenn `home_score === 0 && away_score === 0` → Torschützen-Picker disabled / hidden, oder beim Submit Validierung mit Fehlermeldung "Bei 0:0 kein Torschütze möglich". Bestehender Torschütze wird beim Wechsel auf 0:0 automatisch entfernt.

**Datei:** `app/tip/[matchId].tsx` (UI-Validierung) + ggf. DB-Constraint als Backup.

**Impact:** Klein. Lokale Validierung im Tipp-Modal, keine Migration nötig (oder optional als CHECK-Constraint).

**Fix:** `app/tip/[matchId].tsx` —
- `useEffect` auf `[home, away, scorer]`: clearen Torschützen automatisch wenn beide auf 0 stehen.
- Konstante `isGoalless = home === 0 && away === 0` im Render.
- Scorer-Pressable bei `isGoalless` disabled, opacity 0.5, Empty-State-Text „Bei 0:0 nicht möglich".
- `submit()` defensiv: `submitScorer = isGoalless ? null : scorer`.
DB-Constraint nicht ergänzt (Client-Validierung reicht für Beta; ein CHECK-Constraint wäre defensiv, aber der useEffect ist robust und verhindert Race-Conditions).

---

### 4. 🟢 Username-Filter (Hate-Speech / NS-Begriffe / Beleidigungen) *(umgesetzt 2026-05-08)*
**Problem:** Bei der Username-Wahl ist aktuell **jeder String** erlaubt (außer Duplikate). User können sich z. B. "hitler", "n-wort" oder ähnliches als Anzeigename setzen. Das ist ein **Reputations- und Compliance-Risiko**:
- App-Store-Reviews könnten die App wegen UGC-Moderation negativ einstufen oder ablehnen.
- Andere User sehen den Namen in Liga-Tabellen / Hero-Footer / Sondertipp-Karten — Bolzify trägt potenziell Mitverantwortung.

**Soll:** Mehrstufiger Filter beim `/set-username` und beim `change-username`-Flow:
1. **Blacklist** mit klar verbotenen Begriffen (NS-Vokabular, Slurs DE/EN, sexuell explizite Wörter) — Levenshtein- oder Substring-Match (`adolfh1tler` etc. abfangen).
2. **Generic Format-Regeln** (a-z0-9_, 3-20 Zeichen, kein führender/trailing Underscore) — gibt's vermutlich teilweise schon, gegenchecken.
3. **Report-Flow später** (LATER): "Username melden"-Button auf Profilen → Admin-Review.

**Datei:** `app/set-username.tsx`, ggf. neue `lib/username-filter.ts` mit Wortliste, server-seitig zusätzlich als RPC-Validation falls Bypass möglich.

**Impact:** Mittel. Wortliste pflegen ist Folge-Aufwand, aber MVP-Filter ist überschaubar. **Vor Launch zwingend**, sonst Review-Risiko.

**Fix:** Neue `lib/username-filter.ts` mit Blacklist (~40 Begriffe: NS-Vokabular, DE/EN-Slurs, sexuelle Ausbeutung, Terrorismus, harte Beleidigungen). Normalisierung: lowercase, Underscores raus, Leetspeak (0/1/3/4/5/7/8/9 → o/i/e/a/s/t/b/g) — fängt „h1tler", „ad0lf" usw. Doppelter Pass (raw + leet) erlaubt zahlenbasierte Codes wie „1488". Exportiert `checkUsername(raw): string | null` mit vager Fehlermeldung („Dieser Username ist nicht erlaubt — bitte einen anderen wählen.") — bewusst kein Match-Begriff zurückgegeben, sonst hat der Angreifer einen Roadmap zur Umgehung.

Angewendet in:
- `app/set-username.tsx` (Initial-Setzung nach Sign-Up).
- `app/profile.tsx` (Change-Username im Profil).

**Offen / LATER:**
- Server-Backup (Postgres-Trigger auf `profiles.username`) — derzeit nur Client-Validierung. Bypass nur möglich wenn jemand die App debuggt. Niedriges Risiko in Beta-Phase, aber vor öffentlichem Launch nachziehen.
- Report-Flow auf Profilen (Username melden → Admin-Review).

---

### 5. 🟠 E-Mail-Validierung fehlt bei Registrierung *(Client-Code in v0.26, Supabase-Toggle ausstehend)*
**Problem:** Aktuell wird bei Sign-Up keine E-Mail-Validierung erzwungen — User kann sich mit ungültigen oder Wegwerf-Adressen registrieren, kein Confirm-Mail-Flow erkennbar. Das macht Account-Recovery unmöglich und öffnet Spam-/Bot-Tür.

**Soll:**
- **Format-Check** clientseitig (regex) bevor Submit, klare Fehlermeldung.
- **Confirm-Mail** über Supabase Auth aktivieren (`Email Confirmations` in Supabase Dashboard → Auth → Settings) — User kann sich erst nach Klick auf Bestätigungslink einloggen.
- **Resend-Button** auf Login-Screen falls Mail nicht angekommen.

**Datei:** `app/signup.tsx` (Format-Check), Supabase Dashboard (Confirm-Mail aktivieren), evtl. `app/login.tsx` (Resend-UI).

**Impact:** Mittel. Confirm-Mail-Flow betrifft den gesamten Onboarding-Flow — muss mit Test-Account durchgespielt werden. **Vor Launch zwingend** (Standard-Sicherheitsanforderung, vermeidet Bot-Accounts).

**Fix (Client, v0.26):** `app/login.tsx` —
- `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` — Format-Check vor Submit, klare Fehlermeldung.
- Sign-Up erkennt Confirm-Mail-Modus (kein Error + keine Session): zeigt Info „Wir haben dir eine Bestätigungs-Mail an X geschickt…", switcht automatisch zurück auf Sign-In-Tab.
- Sign-In erkennt „Email not confirmed"-Fehler von Supabase: zeigt Hinweis + Resend-Button.
- `resendConfirmation()` ruft `supabase.auth.resend({ type: 'signup', email })`.

**Ausstehend (User-Action im Supabase-Dashboard):**
- Confirm-Mail in Supabase Dashboard aktivieren: **Auth → Settings → User Signups → Email Confirmations: ON**.
- Mail-Template anpassen (deutsch, Brand „Bolzify", korrekter Redirect-URL).
- SMTP konfigurieren (Supabase-Default schickt 4 Mails/Stunde — für Beta OK, für Launch eigenes SMTP nötig, z. B. Resend, Postmark, oder AWS SES).
- Erst wenn Toggle on + 1 Sign-Up-Test mit Confirm-Click durchgespielt → Punkt 🟢.

---

### 6. 🟢 Onboarding-Slide „Wage die großen Tipps" zu kompliziert / unklar *(umgesetzt 2026-05-08)*
**Problem:** Der Sondertipp-Slide im Onboarding (`app/onboarding.tsx`, Slide 3 von 4) erschlägt den User:
- Headline „Wage die großen Tipps" — Verb „wagen" ist gestelzt, sagt nicht direkt was Sache ist.
- Body: „Vor Anpfiff Weltmeister, Torschützenkönig und Gruppensieger setzen — bis zu 76 Bonuspunkte. Sobald der Ball rollt, sind sie fixiert."
- **„fixiert"** ist nicht eindeutig — der Tester versteht nicht, ob das heißt „werden gespeichert" oder „können nicht mehr geändert werden". (Letzteres ist gemeint: Deadline = Anpfiff Eröffnungsspiel.)
- Drei Konzepte (Weltmeister + Torschützenkönig + Gruppensieger) + Punktzahl + Deadline auf einem Slide ist viel.

**Soll:** Klarer formulieren, „fixiert" raus. Vorschläge:
- Headline: „Tipp den großen Wurf" oder „Wer holt den Pokal?"
- Body z. B.: „Vor dem Eröffnungsspiel auf Weltmeister, Torschützenkönig und Gruppensieger tippen. Danach gesperrt — bis zu 76 Bonuspunkte."
- Oder: „Bis zum Anpfiff des ersten Spiels änderbar, danach final."

**Datei:** `app/onboarding.tsx` (Slide 3, „specials"-Step).

**Impact:** Klein. Pure Text-Änderung, kein Logik-Touch. Wording vorm Launch nochmal mit 1-2 Probelesern checken.

**Fix:** `app/onboarding.tsx` Slide 3 —
- Headline: „Wage die großen Tipps" → **„Wer holt den Pokal?"** (direkter, fragender Hook).
- Body: „Vor Anpfiff Weltmeister, Torschützenkönig und Gruppensieger setzen — bis zu 76 Bonuspunkte. Sobald der Ball rollt, sind sie fixiert." → **„Vor dem Eröffnungsspiel auf Weltmeister, Torschützenkönig und Gruppensieger tippen. Danach gesperrt — bis zu 76 Bonuspunkte."**
- „fixiert" raus, „gesperrt" rein (eindeutig). Deadline („Eröffnungsspiel") explizit. Bonuspunkte am Ende als Belohnungs-Reframing.

---

### 7. 🟢 BUG — Punktzahlen im Tipp-Modal stimmen nicht mit echtem Scoring überein *(umgesetzt 2026-05-08)*
**Problem:** Inkonsistenz, die der Tester direkt entdeckt hat:
- **Onboarding** (Slide 2 „Sammle Punkte", `app/onboarding.tsx:39`): „Genauer Endstand = **6 Punkte** · nur Tordifferenz = **4** · nur Tendenz = **2**. Richtiger Torschütze gibt +3 Bonus."
- **Tipp-Modal** (`app/tip/[matchId].tsx:674-677`, „SO GIBT'S PUNKTE"-Card): Exakter Tipp **+8**, Tordifferenz **+5**, Tendenz **+3**, Erster Torschütze +3.

**Source of Truth:** Die DB-Scoring-Funktion `score_match` (`supabase/migrations/0006_scoring.sql:50-54`) vergibt **6 / 4 / 2** — und im MVP-Scope sind „2/4/6 + Torschützen-Bonus" als finale Spielregeln festgehalten. Das **Tipp-Modal lügt also den User an**: angezeigt 8/5/3, vergeben 6/4/2.

**Soll:** Werte im Tipp-Modal korrigieren auf **+6 / +4 / +2 / +3**. Idealerweise konstanten Block in `lib/scoring-display.ts` oder ähnlich, sodass Onboarding + Tipp-Modal + ggf. Hilfe-Screen aus **einer** Quelle ziehen → solche Drift kann nicht wieder passieren.

**Datei:** `app/tip/[matchId].tsx` (Zeilen 674-677), optional neue `lib/scoring-display.ts`.

**Impact:** Klein im Code (4 Zahlen ändern), aber **Vertrauensverlust groß**, wenn ein User beim ersten Tipp die +8 sieht und am Ende nur 6 bekommt. **Hoch priorisieren.**

**Fix:** `app/tip/[matchId].tsx:674-677` — Werte korrigiert auf `+6 / +4 / +2 / +3`. Zentralen Konstanten-Block (`lib/scoring-display.ts`) nicht eingeführt; Werte stehen weiter inline. Kann später nachgezogen werden, wenn ein dritter Screen die Zahlen braucht.

---

### 8. 🟢 Score-Eingabe mit +/- ist umständlich *(umgesetzt 2026-05-08)*
**Problem:** Auf dem Tipp-Screen wird das Ergebnis (z. B. 0:0) mit `+`- und `-`-Buttons über/unter den großen Ziffern eingestellt. Tester findet das umständlich — bei Tipps wie 3:2 sind das 5 Tap-Aktionen für ein Ergebnis, das man eigentlich „auf einen Schlag" eingeben will.

**Soll-Ideen** (zur Auswahl, nicht alle gleichzeitig):
- **Tap-on-Number** öffnet einen kleinen NumberPicker (Wheel oder 0–9-Grid) — ein Tap pro Wert.
- **Vertikales Swipe** auf der Ziffer (hoch/runter, ähnlich iOS-Wheel) — gestisch elegant, weniger Taps.
- **Quick-Picks**: Pillen unter den Ziffern wie „1:0  2:1  0:0  2:0" — die populärsten Resultate als One-Tap.
- **Direkter Number-Input** mit eingeblendetem Number-Pad — am schnellsten, aber Tastatur poppt rein.

Empfehlung: **Tap-on-Number → kleines 0–9-Grid als BottomSheet** (kombinierbar mit Quick-Picks darüber). Bestehende +/- Buttons können erstmal als Fallback bleiben und im nächsten Schritt entfernt werden.

**Datei:** `app/tip/[matchId].tsx` (Score-Stepper-Komponente).

**Impact:** Mittel. Nicht trivial, aber großer UX-Gewinn — das ist der **meistbenutzte Screen** der App während des Turniers. Wenn das umständlich ist, fühlt sich die ganze App umständlich an.

**Fix:** `app/tip/[matchId].tsx` — drei Eingabewege parallel, jeder optional:
1. **Tap-on-Number**: Die große Ziffer (88pt) ist jetzt ein Pressable. Tap öffnet eine `NumberSheet`-Modal mit 0–9-Grid (4×3, MAX_GOALS=9). Auswahl setzt den Wert + schließt.
2. **Quick-Picks**: Horizontale Scroll-Pillen unter der Score-Card mit den 11 häufigsten Resultaten (`0:0 1:0 0:1 1:1 2:1 1:2 2:0 0:2 2:2 3:1 1:3`). Aktive Kombination = grün hinterlegt. One-Tap setzt home + away gleichzeitig.
3. **Stepper +/−**: Bleibt als Fallback.

Mit dem useEffect aus #3 wird der Torschütze automatisch gecleart, wenn man via Tap-on-Number oder Quick-Pick auf 0:0 wechselt — keine doppelte Validierung nötig.

**Followup ideas (LATER):** Wheel-Picker statt Grid für längeres Wischen, Letztgespielte-Resultate als Quick-Picks (nach 1-2 Spielen lernen wir die Vorlieben des Users).

---

### 9. 🟢 BUG — Spielplan aktualisiert sich nicht nach neuem Tipp *(umgesetzt 2026-05-08)*
**Problem:** Tester hat 2 Tipps abgegeben (Mexiko-Südafrika 2:3, Südkorea-Tschechien 0:0). „Meine Tipps" zeigt **OFFEN · 2** korrekt mit beiden grünen Tipp-Pillen. **Spielplan** zeigt aber:
- „71 OFFEN" (sollte 70 sein, da 2 getippt)
- Mexiko-Südafrika: 2:3-Chip ✅
- Südkorea-Tschechien: weiterhin „tippen"-Button ❌ (sollte 0:0-Chip zeigen)

**Ursache:** `app/(tabs)/matches.tsx:170-172` lädt mit `useEffect(() => { load(); }, [load])` — feuert nur beim Mount oder wenn `userId`/`activeLeagueId` sich ändert, **nicht beim Tab-Focus**. Wenn der User Spielplan einmal geöffnet hat, dann tippt, dann zurück auf Spielplan navigiert → kein Reload, alter `tips`-State bleibt.

**Workaround für User:** Pull-to-refresh aktualisiert (Logik dahinter funktioniert, nur der Trigger fehlt).

**Soll:** `useEffect` durch `useFocusEffect` ersetzen (analog `app/(tabs)/leagues.tsx:148-152`):
```tsx
useFocusEffect(useCallback(() => { load(); }, [load]));
```

**Datei:** `app/(tabs)/matches.tsx` (Zeilen 170-172).

**Impact:** Trivial im Code (3 Zeilen), aber **hohe Sichtbarkeit** — Spielplan ist neben Home der meistbesuchte Screen. Sieht für User wie ein verlorener Tipp aus, obwohl er gespeichert ist. **Sofort fixen, gehört zum gleichen Commit wie #7.**

**Hinweis:** Der Tester fragt „ist vielleicht noch nicht umgesetzt? Beim Intro stand nur ersten Tipp setzen". Antwort: Ist umgesetzt (Mexiko zeigt ja den Chip), nur nicht refresh-aware. Onboarding-Wording „ersten Tipp setzen" könnte man mit Punkt #6 zusammen reviewen.

**Fix:** `app/(tabs)/matches.tsx` — `useEffect(() => { load(); }, [load])` durch `useFocusEffect(useCallback(() => { load(); }, [load]))` ersetzt, Import von `useFocusEffect` aus `expo-router`, ungenutzten `useEffect`-Import entfernt.

---

### 10. 🟢 BUG — Sondertipps-Screen reagiert nicht auf Liga-Wechsel (stale closure) *(umgesetzt 2026-05-08)*
**Problem:** Tester berichtet zwei Symptome, die beide aus einer Wurzel kommen:
1. *„Wenn ich Sondertipps abgebe, kann ich die nicht wieder öffnen."*
2. *„Wenn ich in Liga A bin und den Screen aktualisiere (nach unten ziehen), werden die Daten von der anderen Liga angezeigt."*

**Ursache:** In `app/special-tips.tsx:278` ist die `load`-Callback so memoisiert:
```tsx
const load = useCallback(async () => { /* nutzt activeLeagueId */ }, [user]);
```
`activeLeagueId` wird **innen** verwendet, ist aber **nicht in den Deps**. Konsequenz:
- Beim Liga-Wechsel via `LeaguePickerBar` ändert sich `activeLeagueId` im Hook → Component rerendert → `useCallback` gibt aber **die alte memoisierte Funktion** zurück (mit Closure auf alten `activeLeagueId`).
- `useEffect([load])` bei Zeile 280-282 sieht gleiche `load`-Referenz → feuert nicht erneut → der Screen bleibt auf dem zuletzt geladenen Liga-State stehen.

**Symptom 1 erklärt sich so:** User speichert in Liga A, navigiert weg, kommt über Home (jetzt Liga B aktiv) zurück → mountet frisch → lädt B's leeren State. User wechselt im Picker zurück auf A → load feuert NICHT mehr → Screen zeigt weiter B-State → User denkt seine A-Tipps sind weg / nicht wieder öffenbar.

**Symptom 2 erklärt sich so:** User wechselt im Picker auf eine andere Liga → State des Screens bleibt auf der vorherigen Liga eingefroren → Picker-Pille und angezeigte Daten driften auseinander.

**Zusatz:** Special-Tips-Screen hat **kein** RefreshControl (`<ScrollView>` ohne `refreshControl`). Was der Tester mit „nach unten ziehen" beschreibt, ist der iOS-Bounce — refresht nichts. Verstärkt nur die Verwirrung.

**Soll (Fix):** Analog zu `app/(tabs)/my-tips.tsx:195-200`:
```tsx
const load = useCallback(async () => { /* ... */ }, [user, activeLeagueId]);

useFocusEffect(
  useCallback(() => { load(); }, [load]),
);
```
Plus optional ein `RefreshControl` auf dem ScrollView, damit „nach unten ziehen" auch wirklich neu lädt — konsistent mit anderen Tab-Screens.

**Datei:** `app/special-tips.tsx` (Zeile 106 `useCallback`-Deps + Zeile 280 useEffect → useFocusEffect, optional ScrollView-RefreshControl).

**Impact:** Hoch — Sondertipps sind ein **Kern-Feature** der Differenzierung gegenüber Kicktipp/Comunio (76 Bonuspunkte!). Wenn der Screen nach Liga-Wechsel falsch lädt oder Tipps „verschwinden" wirken, ist das ein Vertrauens-Killer auf dem prominentesten Feature. **Sofort fixen, gehört in den nächsten Bugfix-Commit (zusammen mit #7 + #9).**

**Fix:** `app/special-tips.tsx` — `useCallback`-Deps auf `[user, activeLeagueId]` korrigiert. `useEffect(() => { load(); }, [load])` durch `useFocusEffect(useCallback(() => { load(); }, [load]))` ersetzt. Import von `useFocusEffect` aus `expo-router` ergänzt. RefreshControl auf dem ScrollView wurde **nicht** ergänzt — useFocusEffect reicht für den Hauptpfad (Screen verlassen + zurück), könnte später nachgezogen werden falls Tester weiter pull-to-refresh erwarten.

---
