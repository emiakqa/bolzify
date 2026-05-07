// Home-Screen — Bolzplatz Hi-Fi
// Hybrid: Mood 02 (Light, warm, Schatten) + Mood 01 (Score-Hero, Mono-Daten, Live-Ticker)

function HomeScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Button, Badge, SectionLabel, FlagSquare, flagFor } = window.B;

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 110px",
      display: "flex", flexDirection: "column", gap: 18, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: t.textMuted, fontSize: 14, fontWeight: 500 }}>Moin</div>
          <div style={{
            color: t.text, fontSize: 36, fontFamily: F.display, fontWeight: 800,
            letterSpacing: -1.2, lineHeight: 1.05, marginTop: 2,
          }}>@bolzkoenig</div>
        </div>
        <div style={{
          width: 46, height: 46, borderRadius: 999,
          background: t.warmSoft, color: t.warm,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.display, fontWeight: 800, fontSize: 17,
          boxShadow: t.shadowSm,
        }}>BK</div>
      </div>

      {/* Live-Ticker (mono) */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: t.surface, borderRadius: 12, padding: "10px 14px",
        boxShadow: t.shadowSm,
        fontFamily: F.mono, fontSize: 11, letterSpacing: 0.6, color: t.textMuted,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999, background: t.warm,
          boxShadow: `0 0 0 4px ${t.liveSoft}`,
        }} />
        <span style={{ color: t.text, fontWeight: 600 }}>T-39d 10h 24m</span>
        <span style={{ color: t.textFaint }}>·</span>
        <span style={{ textTransform: "uppercase", letterSpacing: 1 }}>bis Anpfiff MEX–RSA</span>
      </div>

      {/* Match-Hero (Score-led + Flags) */}
      <Card t={t} variant="elevated" padding="md">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Badge t={t} label="GRP A · M1" tone="neutral" />
          <Badge t={t} label="► IN 39d 10h" tone="warm" />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 4 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <FlagSquare gradient={flagFor.Mexiko} size={56} />
            <div style={{ fontSize: 17, fontFamily: F.display, fontWeight: 700, letterSpacing: -0.3, marginTop: 8 }}>Mexiko</div>
          </div>
          <div style={{
            fontFamily: F.display, fontWeight: 800, letterSpacing: -2, lineHeight: 1,
            display: "flex", alignItems: "center", gap: 4, fontSize: 50,
          }}>
            <span>2</span>
            <span style={{ color: t.textFaint, fontSize: 30 }}>:</span>
            <span>0</span>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <FlagSquare gradient={flagFor.Südafrika} size={56} />
            <div style={{ fontSize: 17, fontFamily: F.display, fontWeight: 700, letterSpacing: -0.3, marginTop: 8 }}>Südafrika</div>
          </div>
        </div>
        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.divider}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: F.mono, fontSize: 11, color: t.textMuted, letterSpacing: 0.4,
        }}>
          <span>DO 11.06 · 21:00</span>
          <span style={{ color: t.accent, fontWeight: 700 }}>DEIN TIPP · GESPEICHERT ✓</span>
        </div>
      </Card>

      {/* Sondertipps (warm-akzent) */}
      <Card t={t} variant="warm" padding="md" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: t.warm, color: t.warmFg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.display, fontWeight: 800, fontSize: 20,
        }}>★</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.display, color: t.text }}>Sondertipps</div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: F.mono, letterSpacing: 0.4, marginTop: 2 }}>
            0/17 abgegeben · vor Anpfiff
          </div>
        </div>
        <span style={{ color: t.warm, fontSize: 22 }}>›</span>
      </Card>

      {/* Liga */}
      <div>
        <SectionLabel t={t} label="Deine Ligen" action="Alle" />
        <Card t={t} padding="md" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: t.accentSoft, color: t.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F.display, fontWeight: 800, fontSize: 15,
          }}>TL</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.display }}>Test Liga</div>
            <div style={{ fontSize: 12, color: t.textMuted, fontFamily: F.mono, letterSpacing: 0.4, marginTop: 1 }}>
              1 MITGLIED · #4PUQR7
            </div>
          </div>
          <span style={{ color: t.textFaint, fontSize: 18 }}>›</span>
        </Card>
      </div>

      {/* Tab bar (floating pill) */}
      <TabBar t={t} active="Home" />
    </div>
  );
}

function TabBar({ t, active }) {
  const F = window.bolzFonts;
  const tabs = [
    { l: "Home", i: "▣" },
    { l: "Spielplan", i: "◧" },
    { l: "Tipps", i: "✓" },
    { l: "Ligen", i: "◉" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 26, left: 22, right: 22,
      background: t.surface, borderRadius: 24,
      boxShadow: t.shadowLg,
      padding: "10px 8px",
      display: "flex", justifyContent: "space-around",
    }}>
      {tabs.map((tab) => {
        const a = tab.l === active;
        return (
          <div key={tab.l} style={{
            flex: 1, textAlign: "center",
            color: a ? t.tabActive : t.tabInactive,
            fontSize: 11, fontWeight: 700, fontFamily: F.display,
          }}>
            <div style={{
              width: 26, height: 26, margin: "0 auto 4px",
              borderRadius: 999,
              background: a ? t.accent : "transparent",
              color: a ? t.accentFg : t.tabInactive,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800,
            }}>{tab.i}</div>
            {tab.l}
          </div>
        );
      })}
    </div>
  );
}

window.HomeScreen = HomeScreen;
window.TabBar = TabBar;
