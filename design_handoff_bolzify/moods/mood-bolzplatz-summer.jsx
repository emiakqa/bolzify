// Mood 2: Bolzplatz-Sommer — warm, hell, freundlich, Sommerturnier-Feeling

const summerTokens = {
  bg: "#F4F1EA",            // Off-white, leicht warm
  surface: "#FFFFFF",
  surfaceHi: "#FFFFFF",
  border: "rgba(15,30,20,0.06)",
  borderStrong: "rgba(15,30,20,0.10)",
  text: "#0E1A12",
  textMuted: "#5C6B62",
  textFaint: "#9AA89F",
  accent: "#15803D",        // tiefer Bolzplatz, kontrast auf hell
  accentSoft: "#E8F4EC",
  accentBorder: "rgba(21,128,61,0.30)",
  accentFg: "#FFFFFF",
  warm: "#E8744E",          // Tor-Orange, sekundär
  warmSoft: "#FBE8DD",
  ball: "#1F2A24",
  fontSans: "'Geist', 'Inter', system-ui, sans-serif",
  fontDisplay: "'Familjen Grotesk', 'SF Pro Rounded', system-ui, sans-serif",
};

function SummerHome() {
  const t = summerTokens;
  return (
    <div style={{
      width: "100%", height: "100%",
      background: t.bg, color: t.text,
      fontFamily: t.fontSans,
      padding: "60px 22px 100px",
      display: "flex", flexDirection: "column", gap: 18,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <div>
          <div style={{ color: t.textMuted, fontSize: 14, fontWeight: 500 }}>Servus</div>
          <div style={{ color: t.text, fontSize: 36, fontFamily: t.fontDisplay, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginTop: 2 }}>
            @bolzkoenig
          </div>
        </div>
        <div style={{
          width: 46, height: 46, borderRadius: 999,
          background: t.warmSoft, color: t.warm,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 18,
          boxShadow: "0 1px 2px rgba(15,30,20,0.05)",
        }}>BK</div>
      </div>

      {/* Hero card — soft shadow */}
      <div style={{
        background: t.surface, borderRadius: 24, padding: 22,
        boxShadow: "0 4px 18px rgba(15,30,20,0.06), 0 1px 3px rgba(15,30,20,0.04)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{
            background: t.accentSoft, color: t.accent,
            fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 999, letterSpacing: 0.3,
          }}>Vorrunde · 1. Spieltag</div>
          <div style={{
            color: t.warm, fontSize: 13, fontWeight: 700, fontFamily: t.fontDisplay,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: t.warm }} />
            in 39 Tagen
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 4, padding: "8px 0" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "linear-gradient(135deg, #006847 0%, #ce1126 50%, #ffffff 50%)",
              margin: "0 auto 8px",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
            }} />
            <div style={{ fontSize: 17, fontFamily: t.fontDisplay, fontWeight: 700, letterSpacing: -0.3 }}>Mexiko</div>
          </div>
          <div style={{ textAlign: "center", padding: "0 6px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase" }}>vs</div>
            <div style={{
              marginTop: 6, padding: "4px 12px",
              background: t.accent, color: t.accentFg,
              borderRadius: 999, fontSize: 11, fontWeight: 700,
            }}>21:00</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "linear-gradient(180deg, #007a4d 33%, #ffd700 33% 66%, #de3831 66%)",
              margin: "0 auto 8px",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
            }} />
            <div style={{ fontSize: 17, fontFamily: t.fontDisplay, fontWeight: 700, letterSpacing: -0.3 }}>Südafrika</div>
          </div>
        </div>

        <div style={{
          marginTop: 14, padding: "14px 16px",
          background: t.accentSoft, borderRadius: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, color: t.accent, fontWeight: 600, letterSpacing: 0.2 }}>DEIN TIPP</div>
            <div style={{ fontSize: 22, fontFamily: t.fontDisplay, fontWeight: 800, color: t.text, marginTop: 2 }}>2 : 0</div>
          </div>
          <div style={{
            color: t.accent, fontSize: 13, fontWeight: 600,
          }}>Ändern ›</div>
        </div>
      </div>

      {/* Sondertipps */}
      <div style={{
        background: t.surface, borderRadius: 20, padding: "14px 16px",
        boxShadow: "0 2px 10px rgba(15,30,20,0.04)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: t.warmSoft, color: t.warm,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>🏆</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: t.fontDisplay }}>Sondertipps</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>
            Weltmeister · Finalist · Top-Scorer
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: t.warm,
          background: t.warmSoft, padding: "5px 10px", borderRadius: 999,
        }}>0/17</div>
      </div>

      {/* Liga */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 16, fontFamily: t.fontDisplay, fontWeight: 700 }}>Deine Ligen</div>
          <div style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>Alle ›</div>
        </div>
        <div style={{
          background: t.surface, borderRadius: 18,
          boxShadow: "0 2px 10px rgba(15,30,20,0.04)",
          padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: t.accentSoft, color: t.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 16,
          }}>TL</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: t.fontDisplay }}>Test Liga</div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 1 }}>1 Mitglied · 4PUQR7</div>
          </div>
          <div style={{ color: t.textFaint, fontSize: 18 }}>›</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        position: "absolute", bottom: 26, left: 22, right: 22,
        background: t.surface, borderRadius: 24,
        boxShadow: "0 6px 20px rgba(15,30,20,0.10), 0 1px 3px rgba(15,30,20,0.05)",
        padding: "10px 8px",
        display: "flex", justifyContent: "space-around",
      }}>
        {[
          { l: "Home", a: true },
          { l: "Spiele" },
          { l: "Tipps" },
          { l: "Ligen" },
        ].map((tab) => (
          <div key={tab.l} style={{
            flex: 1, textAlign: "center",
            color: tab.a ? t.accent : t.textFaint,
            fontSize: 11, fontWeight: 700, fontFamily: t.fontDisplay,
            padding: "4px 0",
          }}>
            <div style={{
              width: 22, height: 22, margin: "0 auto 4px",
              borderRadius: 999,
              background: tab.a ? t.accent : "transparent",
              border: tab.a ? "none" : `1.5px solid ${t.textFaint}`,
            }} />
            {tab.l}
          </div>
        ))}
      </div>
    </div>
  );
}

window.SummerHome = SummerHome;
window.summerTokens = summerTokens;
