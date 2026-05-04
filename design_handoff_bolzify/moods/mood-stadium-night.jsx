// Mood 1: Stadion-Nacht — OLED-Schwarz, Lime + Cyan Akzent, Mono-Daten

const stadiumTokens = {
  bg: "#06090A",
  surface: "#0E1416",
  surfaceHi: "#171F22",
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#ECF1F0",
  textMuted: "#7A8A86",
  textFaint: "#4F5C58",
  accent: "#22C55E",       // Bolzplatz bleibt
  accentSoft: "rgba(34,197,94,0.14)",
  accentBorder: "rgba(34,197,94,0.40)",
  accentFg: "#062611",
  flood: "#5EE6E0",        // Flutlicht-Cyan, sekundär
  floodSoft: "rgba(94,230,224,0.12)",
  signal: "#FB923C",
  fontSans: "'Inter', system-ui, sans-serif",
  fontDisplay: "'Archivo', 'SF Pro Rounded', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

function StadiumNightHome() {
  const t = stadiumTokens;
  return (
    <div style={{
      width: "100%", height: "100%",
      background: t.bg, color: t.text,
      fontFamily: t.fontSans,
      padding: "60px 22px 100px",
      overflow: "hidden",
      display: "flex", flexDirection: "column", gap: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
        <div>
          <div style={{ color: t.textMuted, fontSize: 13, fontFamily: t.fontMono, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Matchday · Mi
          </div>
          <div style={{ color: t.text, fontSize: 38, fontFamily: t.fontDisplay, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, marginTop: 4 }}>
            @bolzkoenig
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 999,
          border: `1px solid ${t.borderStrong}`, background: t.surface,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>⚙</div>
      </div>

      {/* Live-Ticker bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 14, padding: "10px 14px",
        fontFamily: t.fontMono, fontSize: 11, letterSpacing: 0.6, color: t.textMuted,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999, background: t.signal,
          boxShadow: `0 0 0 4px ${t.floodSoft}`,
        }} />
        <span style={{ color: t.text }}>T-39d 10h</span>
        <span style={{ color: t.textFaint }}>·</span>
        <span>BIS ANPFIFF MEX–RSA</span>
      </div>

      {/* Match hero — score-led */}
      <div style={{
        background: `linear-gradient(180deg, ${t.surface} 0%, ${t.bg} 100%)`,
        border: `1px solid ${t.borderStrong}`,
        borderRadius: 22, padding: 22,
        position: "relative", overflow: "hidden",
      }}>
        {/* Pitch-line decoration */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle at 50% 100%, ${t.accentSoft} 0%, transparent 55%)`,
          pointerEvents: "none",
        }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, position: "relative" }}>
          <span style={{
            fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
            color: t.textMuted, padding: "5px 9px", border: `1px solid ${t.border}`, borderRadius: 6,
          }}>GRP · M1</span>
          <span style={{
            fontFamily: t.fontMono, fontSize: 11, color: t.accent, letterSpacing: 0.8,
          }}>► IN 39d 10h</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, position: "relative" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 32, fontFamily: t.fontDisplay, fontWeight: 800, letterSpacing: -0.8 }}>MEX</div>
            <div style={{ fontSize: 11, fontFamily: t.fontMono, color: t.textMuted, letterSpacing: 1, marginTop: 2 }}>MEXIKO</div>
          </div>
          <div style={{
            fontSize: 56, fontFamily: t.fontDisplay, fontWeight: 800,
            color: t.accent, letterSpacing: -2, lineHeight: 1,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ color: t.text }}>2</span>
            <span style={{ color: t.textFaint, fontSize: 32 }}>:</span>
            <span style={{ color: t.text }}>0</span>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 32, fontFamily: t.fontDisplay, fontWeight: 800, letterSpacing: -0.8 }}>RSA</div>
            <div style={{ fontSize: 11, fontFamily: t.fontMono, color: t.textMuted, letterSpacing: 1, marginTop: 2 }}>SÜDAFRIKA</div>
          </div>
        </div>

        <div style={{
          marginTop: 18, paddingTop: 14, borderTop: `1px solid ${t.border}`,
          display: "flex", justifyContent: "space-between", fontFamily: t.fontMono, fontSize: 11, color: t.textMuted, letterSpacing: 0.6,
        }}>
          <span>DO 11.06 · 21:00</span>
          <span style={{ color: t.accent }}>DEIN TIPP · GESPEICHERT</span>
        </div>
      </div>

      {/* Sondertipps — flood accent */}
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 18, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: t.floodSoft,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: t.fontDisplay, fontWeight: 800, color: t.flood, fontSize: 18,
        }}>★</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, fontFamily: t.fontDisplay }}>Sondertipps</div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: t.fontMono, letterSpacing: 0.4, marginTop: 2 }}>
            0/17 abgegeben · vor Anpfiff
          </div>
        </div>
        <div style={{ color: t.flood, fontSize: 20 }}>›</div>
      </div>

      {/* Liga */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 8,
        }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: t.textMuted }}>Deine Ligen</div>
          <div style={{ fontSize: 12, color: t.accent }}>Alle ›</div>
        </div>
        <div style={{
          background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16,
          padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: t.accentSoft,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: t.accent, fontFamily: t.fontDisplay, fontWeight: 800,
          }}>TL</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Test Liga</div>
            <div style={{ fontSize: 12, color: t.textMuted, fontFamily: t.fontMono, letterSpacing: 0.4 }}>1 Mitglied · #4PUQR7</div>
          </div>
          <div style={{ color: t.textFaint, fontSize: 18 }}>›</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        position: "absolute", bottom: 22, left: 22, right: 22,
        background: "rgba(14,20,22,0.92)", backdropFilter: "blur(20px)",
        border: `1px solid ${t.borderStrong}`, borderRadius: 22,
        padding: "10px 8px",
        display: "flex", justifyContent: "space-around",
      }}>
        {[
          { l: "Home", a: true },
          { l: "Spielplan" },
          { l: "Tipps" },
          { l: "Ligen" },
        ].map((tab) => (
          <div key={tab.l} style={{
            flex: 1, textAlign: "center",
            color: tab.a ? t.accent : t.textFaint,
            fontSize: 11, fontFamily: t.fontMono, letterSpacing: 0.6,
            padding: "6px 0",
          }}>
            <div style={{
              width: 20, height: 20, margin: "0 auto 4px",
              borderRadius: 6, background: tab.a ? t.accentSoft : "transparent",
              border: `1.5px solid ${tab.a ? t.accent : t.textFaint}`,
            }} />
            {tab.l.toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}

window.StadiumNightHome = StadiumNightHome;
window.stadiumTokens = stadiumTokens;
