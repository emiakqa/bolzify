// Liga-Detail — Tabelle + Mitglied-Rows mit Punkte-Bars.

function LeagueDetailScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Badge } = window.B;

  const me = "@anna_b";
  const rows = [
    { rank: 1, user: "@papa42",   pts: 53, exact: 4, diff: 6, last3: [8, 5, 0] },
    { rank: 2, user: "@anna_b",   pts: 47, exact: 3, diff: 5, last3: [3, 8, 5] },
    { rank: 3, user: "@toni_xx",  pts: 41, exact: 2, diff: 7, last3: [5, 3, 0] },
    { rank: 4, user: "@jenny",    pts: 38, exact: 2, diff: 4, last3: [0, 8, 3] },
    { rank: 5, user: "@krille",   pts: 32, exact: 1, diff: 5, last3: [3, 0, 5] },
    { rank: 6, user: "@bert",     pts: 27, exact: 0, diff: 6, last3: [0, 3, 5] },
    { rank: 7, user: "@maxi",     pts: 19, exact: 0, diff: 4, last3: [0, 0, 3] },
    { rank: 8, user: "@gast_22",  pts: 12, exact: 0, diff: 2, last3: [0, 3, 0] },
  ];
  const max = rows[0].pts;

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 28px",
      display: "flex", flexDirection: "column", gap: 14, overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: t.textMuted, fontSize: 14 }}>‹ Ligen</span>
        <span style={{ color: t.textMuted, fontSize: 18 }}>···</span>
      </div>

      {/* Liga-Header */}
      <div>
        <div style={{
          fontFamily: F.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.4,
          textTransform: "uppercase", color: t.textMuted,
        }}>Liga · 8 Mitglieder</div>
        <div style={{
          fontSize: 30, fontFamily: F.display, fontWeight: 800,
          letterSpacing: -1, lineHeight: 1.1, marginTop: 2,
        }}>Familie & Anhang</div>
      </div>

      {/* Eigener Stand */}
      <Card t={t} variant="accent" padding="md">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            fontFamily: F.display, fontSize: 44, fontWeight: 800,
            letterSpacing: -1.5, color: t.accent, lineHeight: 1,
          }}>#2</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700 }}>Du · @anna_b</div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: t.accent, letterSpacing: 0.4, marginTop: 2 }}>
              47 PKT · 6 PKT HINTER #1
            </div>
          </div>
          <Badge t={t} label="↑ 1" tone="accent" />
        </div>
      </Card>

      {/* Tab-Switcher */}
      <div style={{
        display: "flex", padding: 4, borderRadius: 999, background: t.surfaceSunken,
        border: `1px solid ${t.border}`,
      }}>
        {["Tabelle", "Spielplan", "Sondertipps"].map((tab, i) => (
          <div key={tab} style={{
            flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 999,
            background: i === 0 ? t.surface : "transparent",
            boxShadow: i === 0 ? t.shadowSm : "none",
            fontFamily: F.display, fontSize: 13, fontWeight: 700,
            color: i === 0 ? t.text : t.textMuted, letterSpacing: -0.2,
          }}>{tab}</div>
        ))}
      </div>

      {/* Header-Row */}
      <div style={{
        display: "grid", gridTemplateColumns: "28px 1fr auto 60px",
        gap: 10, padding: "0 4px",
        fontFamily: F.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: 0.6, color: t.textFaint,
      }}>
        <span>#</span>
        <span>SPIELER</span>
        <span style={{ textAlign: "right" }}>LETZTE 3</span>
        <span style={{ textAlign: "right" }}>PUNKTE</span>
      </div>

      {/* Tabelle */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "auto" }}>
        {rows.map((r) => {
          const isMe = r.user === me;
          const isPodium = r.rank <= 3;
          const pct = (r.pts / max) * 100;
          return (
            <div key={r.user} style={{
              display: "grid", gridTemplateColumns: "28px 1fr auto 60px",
              gap: 10, alignItems: "center",
              padding: "10px 4px",
              borderTop: `1px solid ${t.divider}`,
              background: isMe ? t.accentSoft : "transparent",
              borderRadius: isMe ? 10 : 0,
              ...(isMe ? { padding: "10px 8px", borderTop: "none" } : {}),
            }}>
              <span style={{
                fontFamily: F.display, fontSize: 18, fontWeight: 800,
                color: isPodium ? t.accent : t.textMuted,
                letterSpacing: -0.5,
              }}>{r.rank}</span>
              <div>
                <div style={{
                  fontFamily: F.display, fontSize: 14, fontWeight: 700, letterSpacing: -0.2,
                  color: t.text,
                }}>{r.user}</div>
                <div style={{
                  fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.3, marginTop: 2,
                }}>{r.exact}× EXAKT · {r.diff}× DIFF</div>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {r.last3.map((p, i) => (
                  <div key={i} style={{
                    width: 22, height: 26, borderRadius: 4,
                    background: p === 0 ? t.surfaceSunken : p >= 5 ? t.accent : t.accentSoft,
                    border: p === 0 ? `1px dashed ${t.border}` : "none",
                    color: p === 0 ? t.textFaint : p >= 5 ? t.accentFg : t.accent,
                    fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{p === 0 ? "—" : p}</div>
                ))}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontFamily: F.display, fontSize: 17, fontWeight: 800,
                  color: t.text, letterSpacing: -0.3, lineHeight: 1,
                }}>{r.pts}</div>
                <div style={{
                  height: 3, background: t.surfaceSunken, borderRadius: 999, marginTop: 4,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: isMe ? t.accent : t.textMuted, opacity: isMe ? 1 : 0.5,
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.LeagueDetailScreen = LeagueDetailScreen;
