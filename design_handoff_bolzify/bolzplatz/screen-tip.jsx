// Tip-Eingabe — Match-Detail mit Stepper-Eingabe.
// Hierarchie: Match-Hero (Teams + Score-Stepper) → Torschütze → Submit.

function TipScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Button, Badge, FlagSquare, flagFor } = window.B;

  const home = "Deutschland";
  const away = "Brasilien";
  const tipH = 2;
  const tipA = 1;

  const Stepper = ({ value }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        background: t.surface, boxShadow: t.shadowSm,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F.display, fontSize: 22, fontWeight: 700, color: t.textMuted, lineHeight: 1,
      }}>+</div>
      <div style={{
        fontFamily: F.display, fontSize: 88, fontWeight: 800,
        letterSpacing: -3, lineHeight: 1, color: t.text,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        background: t.surface, boxShadow: t.shadowSm,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F.display, fontSize: 22, fontWeight: 700, color: t.textMuted, lineHeight: 1,
      }}>−</div>
    </div>
  );

  const TeamLabel = ({ name, flag }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
      <FlagSquare gradient={flag} size={40} radius={10} />
      <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, letterSpacing: -0.2, textAlign: "center" }}>{name}</div>
    </div>
  );

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 28px",
      display: "flex", flexDirection: "column", gap: 18, overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: t.textMuted, fontSize: 14 }}>‹ Zurück</span>
        <Badge t={t} label="GRUPPE C" tone="neutral" />
        <span style={{ width: 50 }} />
      </div>

      {/* Kickoff bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", borderRadius: 14,
        background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: t.accent }} />
          <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: t.accent }}>
            ANPFIFF IN
          </span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 14, fontWeight: 700, letterSpacing: 0.4, color: t.accent }}>
          T-39d 10h 12m
        </span>
      </div>

      {/* Score-Hero */}
      <Card t={t} variant="elevated" padding="lg" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
          <Stepper value={tipH} />
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F.display, fontSize: 56, fontWeight: 800, color: t.textFaint,
            lineHeight: 1, paddingTop: 28,
          }}>:</div>
          <Stepper value={tipA} />
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
          <TeamLabel name={home} flag={flagFor[home]} />
          <div style={{ width: 8 }} />
          <TeamLabel name={away} flag={flagFor[away]} />
        </div>
      </Card>

      {/* Datum / Stadion */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: F.mono, fontSize: 11, color: t.textMuted, letterSpacing: 0.4,
      }}>
        <span>SO 21.06.2026 · 21:00 MESZ</span>
        <span>METLIFE · NEW JERSEY</span>
      </div>

      {/* Torschütze */}
      <div>
        <div style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 700,
          letterSpacing: 1.4, textTransform: "uppercase", color: t.textMuted,
          marginBottom: 8,
        }}>Bonus · Erster Torschütze (+3 Pkt)</div>
        <Card t={t} variant="flat" padding="md" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 999,
            background: t.warmSoft, color: t.warm,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F.display, fontWeight: 800, fontSize: 12,
          }}>JM</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>Jamal Musiala</div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: t.textMuted, letterSpacing: 0.3 }}>
              #14 · MITTELFELD · DEUTSCHLAND
            </div>
          </div>
          <span style={{ color: t.textFaint, fontSize: 18 }}>›</span>
        </Card>
      </div>

      {/* Punkte-Erklärung */}
      <Card t={t} variant="flat" padding="md">
        <div style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 700,
          letterSpacing: 1.4, textTransform: "uppercase", color: t.textMuted,
          marginBottom: 8,
        }}>So gibt's Punkte</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { l: "Exakt richtig", p: "+8" },
            { l: "Tordifferenz", p: "+5" },
            { l: "Tendenz", p: "+3" },
            { l: "Erster Torschütze", p: "+3" },
          ].map((r) => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: t.text }}>{r.l}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: t.accent }}>{r.p} PKT</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Submit */}
      <div style={{ marginTop: "auto" }}>
        <Button t={t} label="Tipp speichern" variant="primary" size="lg" fullWidth />
      </div>
    </div>
  );
}

window.TipScreen = TipScreen;
