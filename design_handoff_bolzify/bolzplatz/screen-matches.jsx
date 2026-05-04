// Spielplan — gruppiert nach Stage. Sticky Section Headers (Mono-Label).

function MatchesScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Badge, FlagSquare, flagFor } = window.B;

  const sections = [
    {
      title: "Gruppe A",
      data: [
        { d: "DO 11.06 · 21:00", h: "Mexiko", a: "Südafrika", tip: "2:0", pts: 4, fin: false, live: true },
        { d: "FR 12.06 · 18:00", h: "Argentinien", a: "USA", tip: "1:1", pts: null, fin: false },
        { d: "FR 12.06 · 21:00", h: "Spanien", a: "Marokko", tip: null, pts: null, fin: false },
      ],
    },
    {
      title: "Gruppe B",
      data: [
        { d: "SA 13.06 · 18:00", h: "Deutschland", a: "Japan", tip: null, pts: null, fin: false },
        { d: "SA 13.06 · 21:00", h: "Frankreich", a: "Senegal", tip: "2:1", pts: null, fin: false },
      ],
    },
  ];

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 110px",
      display: "flex", flexDirection: "column", gap: 14, overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{
            fontFamily: F.mono, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
            color: t.textMuted, fontWeight: 700,
          }}>WM 2026 · 64 Spiele</div>
          <div style={{
            fontSize: 32, fontFamily: F.display, fontWeight: 800,
            letterSpacing: -1, lineHeight: 1.1, marginTop: 4,
          }}>Spielplan</div>
        </div>
        <Badge t={t} label="3 OFFEN" tone="warm" />
      </div>

      {sections.map((sec) => (
        <div key={sec.title}>
          <div style={{
            fontFamily: F.mono, fontSize: 11, fontWeight: 700,
            letterSpacing: 1.4, textTransform: "uppercase",
            color: t.textMuted, padding: "6px 0 10px",
            position: "sticky", top: 0, background: t.bg, zIndex: 1,
          }}>{sec.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sec.data.map((m, i) => (
              <Card key={i} t={t} padding="md">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.6, fontWeight: 600,
                    }}>{m.d}{m.live ? <span style={{ color: t.warm, marginLeft: 6 }}>● LIVE</span> : null}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FlagSquare gradient={flagFor[m.h]} size={20} radius={4} />
                      <span style={{ fontSize: 15, fontFamily: F.display, fontWeight: 700, letterSpacing: -0.3 }}>{m.h}</span>
                      <span style={{ color: t.textFaint, fontSize: 12, fontFamily: F.mono }}>vs</span>
                      <FlagSquare gradient={flagFor[m.a]} size={20} radius={4} />
                      <span style={{ fontSize: 15, fontFamily: F.display, fontWeight: 700, letterSpacing: -0.3 }}>{m.a}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {m.tip ? (
                      <Badge t={t} label={m.tip} tone="accent" />
                    ) : (
                      <Badge t={t} label="tippen" tone="neutral" />
                    )}
                    {m.pts !== null && m.pts !== undefined ? (
                      <span style={{
                        fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: t.accent, letterSpacing: 0.4,
                      }}>+{m.pts} PKT</span>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <window.TabBar t={t} active="Spielplan" />
    </div>
  );
}

window.MatchesScreen = MatchesScreen;
