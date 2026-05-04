// Sondertipps — entstopfter Layout. Tabs: Top-Tipps / Gruppensieger.
// 4 Team-Slots als 2×2 Grid (kompakter), Top-Scorer als eigene große Card,
// Gruppensieger als horizontaler Letter-Switcher statt 12 identischen Pressables.

function SpecialTipsScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Button, Badge, FlagSquare, flagFor } = window.B;

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 28px",
      display: "flex", flexDirection: "column", gap: 14, overflow: "hidden",
    }}>
      {/* Back + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: t.textMuted, fontSize: 14, fontFamily: F.body }}>← Zurück</span>
      </div>
      <div>
        <div style={{
          fontFamily: F.mono, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
          color: t.warm, fontWeight: 700,
        }}>★ Sondertipps · 3/17</div>
        <div style={{
          fontSize: 32, fontFamily: F.display, fontWeight: 800,
          letterSpacing: -1, lineHeight: 1.1, marginTop: 4,
        }}>Tippe das Turnier</div>
      </div>

      {/* Deadline-Pill */}
      <Card t={t} variant="warm" padding="sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{
            fontFamily: F.mono, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
            color: t.warm, fontWeight: 700,
          }}>Abgabe bis</div>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, marginTop: 1 }}>11. Juni · 20:00</div>
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: 14, fontWeight: 700, color: t.warm, letterSpacing: 0.5,
        }}>39d 10h</div>
      </Card>

      {/* Sub-Tabs */}
      <div style={{
        display: "flex", gap: 4, padding: 4, borderRadius: 999,
        background: t.surfaceSunken, border: `1px solid ${t.border}`,
      }}>
        {["Top-Tipps", "Gruppensieger"].map((tab, i) => (
          <div key={tab} style={{
            flex: 1, textAlign: "center", padding: "8px 12px", borderRadius: 999,
            background: i === 0 ? t.surface : "transparent",
            color: i === 0 ? t.text : t.textMuted,
            fontFamily: F.display, fontWeight: 700, fontSize: 13,
            boxShadow: i === 0 ? t.shadowSm : "none",
          }}>{tab}</div>
        ))}
      </div>

      {/* 2×2 Slot Grid für Top-Tipps */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <SlotCard t={t} F={F} label="Weltmeister" team="Brasilien" tone="accent" />
        <SlotCard t={t} F={F} label="Finalgegner" team="Frankreich" tone="accent" />
        <SlotCard t={t} F={F} label="3. Halbfinalist" team={null} tone="empty" />
        <SlotCard t={t} F={F} label="4. Halbfinalist" team={null} tone="empty" />
      </div>

      {/* Top-Scorer als prominenter Slot */}
      <Card t={t} variant="flat" padding="md">
        <div style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
          textTransform: "uppercase", color: t.warm, marginBottom: 6,
        }}>⚽ Torschützenkönig</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: t.warmSoft,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F.display, fontWeight: 800, color: t.warm, fontSize: 18,
          }}>9</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Kylian Mbappé</div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: t.textMuted, letterSpacing: 0.4, marginTop: 1 }}>
              FRANKREICH · STÜRMER
            </div>
          </div>
          <span style={{ color: t.textFaint, fontSize: 18 }}>›</span>
        </div>
      </Card>

      {/* Save */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        <Button t={t} label="Sondertipps speichern" variant="primary" size="lg" fullWidth />
        <div style={{
          textAlign: "center", fontFamily: F.mono, fontSize: 10, letterSpacing: 0.6,
          color: t.textFaint, marginTop: 2,
        }}>BIS ZUR DEADLINE BELIEBIG OFT ÄNDERBAR</div>
      </div>
    </div>
  );
}

function SlotCard({ t, F, label, team, tone }) {
  const filled = !!team;
  const flag = team ? window.B.flagFor[team] : null;
  return (
    <div style={{
      background: t.surface,
      border: `1.5px solid ${filled ? t.accentBorder : t.border}`,
      borderRadius: 18, padding: 14,
      boxShadow: t.shadowSm,
      display: "flex", flexDirection: "column", gap: 10,
      minHeight: 110,
    }}>
      <div style={{
        fontFamily: F.mono, fontSize: 9, fontWeight: 700,
        letterSpacing: 1.4, textTransform: "uppercase",
        color: filled ? t.accent : t.textFaint,
      }}>{label}</div>
      {filled ? (
        <>
          <window.B.FlagSquare gradient={flag} size={36} radius={10} />
          <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>{team}</div>
        </>
      ) : (
        <>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: t.surfaceSunken, border: `1px dashed ${t.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: t.textFaint, fontSize: 18,
          }}>+</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: t.textMuted, fontWeight: 500 }}>Team wählen…</div>
        </>
      )}
    </div>
  );
}

window.SpecialTipsScreen = SpecialTipsScreen;
