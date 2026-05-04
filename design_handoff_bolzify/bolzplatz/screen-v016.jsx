// v0.16-Referenz: Home-Screen im aktuellen Stand (vor dem Refresh).
// Pixel-getreu nach den Screenshots: ui-rounded font, grünlich-getöntes Anthrazit,
// Tailwind-Grün #22C55E, dichte Card-Layouts, Border statt Shadow.
// Dient als A/B-Vergleich gegen den Bolzplatz-Refresh.

function V016HomeScreen({ scheme = "dark" }) {
  // v0.16-Tokens grob aus design.ts
  const dark = scheme === "dark";
  const c = dark ? {
    bg: "#0A0D0B", surface: "#1B221E", surfaceEl: "#2A322D",
    border: "rgba(255,255,255,0.06)", borderStrong: "rgba(255,255,255,0.12)",
    text: "#F2F5F3", textMuted: "#7E8E83", textFaint: "#5A695F",
    accent: "#22C55E", accentSoft: "rgba(34,197,94,0.14)", accentBorder: "rgba(34,197,94,0.35)",
    accentFg: "#062611", tabInactive: "#5A695F",
  } : {
    bg: "#F7F9F8", surface: "#FFFFFF", surfaceEl: "#EFF3F0",
    border: "rgba(0,0,0,0.06)", borderStrong: "rgba(0,0,0,0.12)",
    text: "#0F1A12", textMuted: "#5A695F", textFaint: "#7E8E83",
    accent: "#16A34A", accentSoft: "rgba(34,197,94,0.10)", accentBorder: "rgba(22,163,74,0.30)",
    accentFg: "#FFFFFF", tabInactive: "#7E8E83",
  };
  const F = "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif";

  const Card = ({ children, accent, padding = 16, style }) => (
    <div style={{
      background: accent ? c.accentSoft : c.surface,
      borderRadius: 14, padding,
      border: `1px solid ${accent ? c.accentBorder : c.border}`,
      ...style,
    }}>{children}</div>
  );

  return (
    <div style={{
      width: "100%", height: "100%", background: c.bg, color: c.text,
      fontFamily: F, padding: "60px 16px 110px", overflow: "hidden",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, color: c.textMuted, fontWeight: 500 }}>Moin</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.1, color: c.text }}>@anna_b</div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 999, background: c.surface,
          border: `1px solid ${c.borderStrong}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: c.textMuted, fontSize: 18,
        }}>⚙</div>
      </div>

      {/* Section header */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.4,
        marginTop: 8, marginBottom: 4,
      }}>NÄCHSTES MATCH</div>

      {/* Hero */}
      <Card padding={20} style={{ boxShadow: dark ? "0 6px 14px rgba(0,0,0,0.22)" : "0 6px 14px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: c.textMuted, letterSpacing: 0.3,
            background: c.surfaceEl, border: `1px solid ${c.border}`,
            padding: "4px 10px", borderRadius: 999,
          }}>GROUP C</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: c.accent, letterSpacing: 0.3,
            background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
            padding: "4px 10px", borderRadius: 999,
          }}>39d 10h</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
          <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: c.text }}>Deutschland</div>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: c.accent, fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
          }}>VS</div>
          <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: c.text }}>Brasilien</div>
        </div>
        <div style={{ textAlign: "center", fontSize: 13, color: c.textMuted, marginBottom: 14 }}>
          So 21.06 · 21:00
        </div>
        <div style={{
          background: c.accent, borderRadius: 999, padding: "12px 16px",
          textAlign: "center", color: c.accentFg, fontSize: 15, fontWeight: 700,
        }}>Jetzt tippen →</div>
      </Card>

      <div style={{
        fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.4,
        marginTop: 10, marginBottom: 4,
      }}>SONDERTIPPS</div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Weltmeister · Finalist · Torschützenkönig</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>3 von 5 Feldern ausgefüllt</div>
          </div>
          <span style={{ color: c.textFaint, fontSize: 22 }}>›</span>
        </div>
      </Card>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 10, marginBottom: 4,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.4,
        }}>DEINE LIGEN</div>
        <span style={{ fontSize: 13, color: c.accent, fontWeight: 600 }}>Alle</span>
      </div>
      <Card padding={12}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, background: c.accentSoft,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: c.accent, fontSize: 16,
          }}>👥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Familie & Anhang</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>8 Mitglieder</div>
          </div>
          <span style={{ color: c.textFaint, fontSize: 22 }}>›</span>
        </div>
      </Card>

      {/* Tab bar */}
      <div style={{
        position: "absolute", bottom: 24, left: 16, right: 16,
        background: c.surface, borderRadius: 14,
        border: `1px solid ${c.border}`,
        padding: "10px 8px",
        display: "flex", justifyContent: "space-around",
        boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
      }}>
        {[{l:"Home",a:true},{l:"Spielplan"},{l:"Tipps"},{l:"Ligen"}].map(tab => (
          <div key={tab.l} style={{ textAlign: "center" }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, margin: "0 auto",
              background: tab.a ? c.accent : c.tabInactive, opacity: tab.a ? 1 : 0.6,
            }} />
            <div style={{
              fontSize: 10, fontWeight: 600, marginTop: 4,
              color: tab.a ? c.accent : c.tabInactive,
            }}>{tab.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.V016HomeScreen = V016HomeScreen;
