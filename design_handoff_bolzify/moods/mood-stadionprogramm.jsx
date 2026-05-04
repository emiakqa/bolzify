// Mood 3: Stadionprogramm — editorial, Print-DNA, Serif Display + Mono

const programmTokens = {
  bg: "#EDE7DA",             // Programmheft-Papier
  surface: "#FFFFFE",
  surfaceTint: "#F6F0E2",
  border: "rgba(20,30,15,0.18)",
  borderStrong: "#1B2A20",
  text: "#0F1A12",
  textMuted: "#4A5A50",
  textFaint: "#7A8A82",
  accent: "#0F4D2C",         // Tann-Grün (immer noch "Bolzplatz")
  accentSoft: "#D5E5DA",
  accentBorder: "#0F4D2C",
  accentFg: "#FFFFFE",
  ink: "#0F1A12",
  redInk: "#A02A2A",
  fontSans: "'Inter', system-ui, sans-serif",
  fontSerif: "'DM Serif Display', 'Playfair Display', Georgia, serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

function ProgrammHome() {
  const t = programmTokens;
  return (
    <div style={{
      width: "100%", height: "100%",
      background: t.bg, color: t.text,
      fontFamily: t.fontSans,
      padding: "54px 22px 100px",
      display: "flex", flexDirection: "column", gap: 16,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Header — newspaper masthead */}
      <div style={{
        borderBottom: `2px solid ${t.borderStrong}`,
        paddingBottom: 12, marginBottom: 4,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
          color: t.textMuted, marginBottom: 4,
        }}>
          <span>№ 01 · Mi 03.05.26</span>
          <span>Berlin</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{
            fontFamily: t.fontSerif, fontWeight: 400,
            fontSize: 36, letterSpacing: -1, lineHeight: 0.95,
          }}>
            @bolzkoenig
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 999,
            border: `1.5px solid ${t.borderStrong}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontFamily: t.fontMono,
          }}>BK</div>
        </div>
      </div>

      {/* Hero — editorial match card */}
      <div>
        <div style={{
          fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase",
          color: t.redInk, fontWeight: 700,
        }}>
          ✶ Eröffnungsspiel
        </div>
        <div style={{
          background: t.surface,
          border: `1.5px solid ${t.borderStrong}`,
          padding: "20px 18px",
          marginTop: 8,
          position: "relative",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            fontFamily: t.fontMono, fontSize: 10, color: t.textMuted, letterSpacing: 1.2, textTransform: "uppercase",
            marginBottom: 14,
          }}>
            <span>Gruppe A · M1</span>
            <span>Do 11.06 · 21:00 MEZ</span>
          </div>

          <div style={{
            fontFamily: t.fontSerif, fontWeight: 400,
            fontSize: 38, lineHeight: 0.95, letterSpacing: -1.2,
            textAlign: "center", padding: "8px 0",
          }}>
            <div>Mexiko</div>
            <div style={{
              fontSize: 13, fontFamily: t.fontMono, letterSpacing: 4, color: t.textMuted,
              margin: "6px 0",
            }}>—  vs  —</div>
            <div>Südafrika</div>
          </div>

          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{
                fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.4, color: t.textMuted, textTransform: "uppercase",
              }}>Dein Tipp</div>
              <div style={{
                fontFamily: t.fontSerif, fontSize: 26, lineHeight: 1, marginTop: 2,
              }}>2 : 0</div>
            </div>
            <div style={{
              padding: "8px 14px",
              border: `1.5px solid ${t.borderStrong}`,
              background: t.accent, color: t.accentFg,
              fontFamily: t.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700,
            }}>Bearbeiten →</div>
          </div>
        </div>
      </div>

      {/* Sondertipps as banner */}
      <div style={{
        background: t.accent, color: t.accentFg,
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.7,
          }}>Sondertipps · 0/17</div>
          <div style={{
            fontFamily: t.fontSerif, fontSize: 22, lineHeight: 1.1, marginTop: 4,
          }}>Tippe vor dem Anpfiff</div>
        </div>
        <div style={{ fontFamily: t.fontSerif, fontSize: 28 }}>→</div>
      </div>

      {/* Liga — list */}
      <div>
        <div style={{
          fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase",
          color: t.textMuted, fontWeight: 700, marginBottom: 8,
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
        }}>
          <span>Deine Ligen</span>
          <span style={{ color: t.accent }}>Alle →</span>
        </div>
        <div style={{
          borderTop: `1.5px solid ${t.borderStrong}`,
          borderBottom: `1.5px solid ${t.borderStrong}`,
          padding: "14px 4px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            fontFamily: t.fontSerif, fontSize: 28, lineHeight: 1, color: t.accent, minWidth: 36,
          }}>1.</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.fontSerif, fontSize: 20, lineHeight: 1.1 }}>Test Liga</div>
            <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textMuted, marginTop: 2, letterSpacing: 0.4 }}>
              1 Mitglied · #4PUQR7
            </div>
          </div>
          <div style={{
            fontFamily: t.fontMono, fontSize: 18, color: t.text,
          }}>→</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: t.surfaceTint,
        borderTop: `1.5px solid ${t.borderStrong}`,
        padding: "10px 14px 22px",
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
            color: tab.a ? t.accent : t.textMuted,
            fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700,
            padding: "4px 0",
            borderTop: tab.a ? `2px solid ${t.accent}` : "2px solid transparent",
          }}>
            <div style={{ marginTop: 6 }}>{tab.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ProgrammHome = ProgrammHome;
window.programmTokens = programmTokens;
