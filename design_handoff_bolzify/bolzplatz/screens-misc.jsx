// Ligen + My-Tips + Inbox kombiniert in einer Datei

function LeaguesScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Button, Badge } = window.B;

  const leagues = [
    { n: "Familie & Anhang", code: "4PUQR7", m: 8, rank: 2, pts: 47, leader: "@papa42" },
    { n: "Bürotipprunde 26", code: "X9ZK2L", m: 14, rank: 5, pts: 41, leader: "@jenny" },
    { n: "Test Liga", code: "QQ12AB", m: 1, rank: 1, pts: 0, leader: null },
  ];

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 110px",
      display: "flex", flexDirection: "column", gap: 14, overflow: "hidden",
    }}>
      <div style={{
        fontSize: 32, fontFamily: F.display, fontWeight: 800,
        letterSpacing: -1, lineHeight: 1.1,
      }}>Ligen</div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button t={t} label="+ Erstellen" variant="primary" size="md" fullWidth style={{ flex: 1 }} />
        <Button t={t} label="Beitreten" variant="secondary" size="md" fullWidth style={{ flex: 1 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {leagues.map((l, i) => (
          <Card key={i} t={t} padding="md">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: i === 0 ? t.accent : t.accentSoft,
                color: i === 0 ? t.accentFg : t.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: F.display, fontWeight: 800, fontSize: 16,
              }}>{l.n.slice(0,2).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
                }}>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{l.n}</div>
                </div>
                <div style={{
                  display: "flex", gap: 10, alignItems: "center",
                  fontFamily: F.mono, fontSize: 11, color: t.textMuted, letterSpacing: 0.3,
                }}>
                  <span>#{l.code}</span>
                  <span style={{ color: t.textFaint }}>·</span>
                  <span>{l.m} {l.m === 1 ? "MITGLIED" : "MITGLIEDER"}</span>
                </div>
              </div>
              {l.pts > 0 ? (
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontFamily: F.display, fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
                    color: l.rank <= 3 ? t.accent : t.text,
                  }}>#{l.rank}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.6, marginTop: 0 }}>{l.pts} PKT</div>
                </div>
              ) : (
                <span style={{ color: t.textFaint, fontSize: 18 }}>›</span>
              )}
            </div>
            {l.leader ? (
              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.divider}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontFamily: F.mono, fontSize: 11, color: t.textMuted, letterSpacing: 0.3,
              }}>
                <span>👑 LEADER · {l.leader}</span>
                <span style={{ color: t.warm, fontWeight: 700 }}>+6 PKT VORN</span>
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      <window.TabBar t={t} active="Ligen" />
    </div>
  );
}

function MyTipsScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Badge, FlagSquare, flagFor } = window.B;

  const open = [
    { d: "DO 11.06 · 21:00", h: "Mexiko", a: "Südafrika", tip: "2:0", scorer: "Lozano" },
    { d: "FR 12.06 · 18:00", h: "Argentinien", a: "USA", tip: "1:1", scorer: null },
    { d: "FR 12.06 · 21:00", h: "Spanien", a: "Marokko", tip: "3:1", scorer: "Yamal" },
  ];
  const finished = [
    { d: "FR 06.06 · 21:00", h: "Deutschland", a: "Japan", tip: "2:1", res: "2:1", pts: 8, ok: "exact" },
    { d: "SA 07.06 · 18:00", h: "Frankreich", a: "Senegal", tip: "2:0", res: "1:1", pts: 0, ok: "miss" },
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
          }}>Saison · WM 2026</div>
          <div style={{
            fontSize: 32, fontFamily: F.display, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginTop: 4,
          }}>Meine Tipps</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: F.display, fontSize: 36, fontWeight: 800, letterSpacing: -1, color: t.accent, lineHeight: 1,
          }}>47</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.6, marginTop: 2 }}>PUNKTE</div>
        </div>
      </div>

      {/* Section: Offen */}
      <div style={{
        fontFamily: F.mono, fontSize: 11, fontWeight: 700,
        letterSpacing: 1.4, textTransform: "uppercase", color: t.textMuted,
      }}>Offen · {open.length}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {open.map((m, i) => (
          <Card key={i} t={t} padding="md">
            <div style={{
              fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.6, fontWeight: 600, marginBottom: 6,
            }}>{m.d}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FlagSquare gradient={flagFor[m.h]} size={20} radius={4} />
              <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>{m.h}</span>
              <span style={{ color: t.textFaint, fontSize: 12, fontFamily: F.mono }}>vs</span>
              <FlagSquare gradient={flagFor[m.a]} size={20} radius={4} />
              <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>{m.a}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge t={t} label={`Tipp ${m.tip}`} tone="accent" />
              {m.scorer ? (
                <span style={{ fontFamily: F.mono, fontSize: 11, color: t.textMuted, letterSpacing: 0.3 }}>⚽ {m.scorer}</span>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {/* Section: Gespielt */}
      <div style={{
        fontFamily: F.mono, fontSize: 11, fontWeight: 700,
        letterSpacing: 1.4, textTransform: "uppercase", color: t.textMuted, marginTop: 4,
      }}>Gespielt · {finished.length}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {finished.map((m, i) => (
          <Card key={i} t={t} padding="md">
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
              fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.6,
            }}>
              <span>{m.d}</span>
              <span style={{ color: m.pts > 0 ? t.accent : t.textFaint, fontWeight: 700 }}>+{m.pts} PKT</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FlagSquare gradient={flagFor[m.h]} size={20} radius={4} />
              <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.3, flex: 1 }}>{m.h}</span>
              <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: t.text }}>{m.res.split(":")[0]}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <FlagSquare gradient={flagFor[m.a]} size={20} radius={4} />
              <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.3, flex: 1 }}>{m.a}</span>
              <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: t.text }}>{m.res.split(":")[1]}</span>
            </div>
            <div style={{
              padding: "8px 10px", borderRadius: 10,
              background: m.ok === "exact" ? t.accentSoft : t.surfaceSunken,
              fontFamily: F.mono, fontSize: 11, letterSpacing: 0.4, fontWeight: 600,
              color: m.ok === "exact" ? t.accent : t.textMuted,
              display: "flex", justifyContent: "space-between",
            }}>
              <span>DEIN TIPP {m.tip}</span>
              <span>{m.ok === "exact" ? "✓ EXAKT" : "✗ DANEBEN"}</span>
            </div>
          </Card>
        ))}
      </div>

      <window.TabBar t={t} active="Tipps" />
    </div>
  );
}

function InboxScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Button, Badge } = window.B;

  const msgs = [
    { from: "@papa42", liga: "Familie & Anhang", t: "Erinnerung", body: "Hey Leute, denkt an die Tipps für Mexiko–Südafrika! Letzter Anpfiff vor der Deadline.", time: "VOR 2H", unread: true },
    { from: "@bolzify-team", liga: null, t: "System", body: "Sondertipps-Phase startet in 39 Tagen. Du hast 3 von 17 abgegeben.", time: "VOR 1T", unread: true },
    { from: "@jenny", liga: "Bürotipprunde 26", t: "Broadcast", body: "Wer kommt am Mittwoch zum gemeinsamen Schauen? Bei Toni um 20h.", time: "VOR 3T", unread: false },
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
            fontFamily: F.mono, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: t.textMuted, fontWeight: 700,
          }}>2 ungelesen</div>
          <div style={{ fontSize: 32, fontFamily: F.display, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginTop: 4 }}>Postfach</div>
        </div>
        <Button t={t} label="✎ Neu" variant="warm" size="md" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m, i) => (
          <Card key={i} t={t} padding="md" style={{ position: "relative" }}>
            {m.unread ? (
              <div style={{
                position: "absolute", top: 16, left: -2,
                width: 4, height: 28, borderRadius: 2, background: t.warm,
              }} />
            ) : null}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 999,
                background: m.t === "System" ? t.accentSoft : t.warmSoft,
                color: m.t === "System" ? t.accent : t.warm,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: F.display, fontWeight: 800, fontSize: 14,
              }}>{m.from.slice(1,3).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{m.from}</span>
                  {m.liga ? <span style={{ fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.4 }}>· {m.liga}</span> : null}
                </div>
                <div style={{
                  fontSize: 13, lineHeight: 1.45, color: t.textMuted,
                  textWrap: "pretty",
                }}>{m.body}</div>
                <div style={{
                  marginTop: 6, fontFamily: F.mono, fontSize: 10, color: t.textFaint, letterSpacing: 0.6,
                }}>{m.time}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <window.TabBar t={t} active="Home" />
    </div>
  );
}

function ComposerScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Button, Badge } = window.B;

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 28px",
      display: "flex", flexDirection: "column", gap: 14, overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: t.textMuted, fontSize: 14 }}>Abbrechen</span>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>Broadcast</span>
        <span style={{ color: t.accent, fontFamily: F.display, fontSize: 14, fontWeight: 700 }}>Senden</span>
      </div>

      <div>
        <div style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase",
          color: t.textMuted, marginBottom: 8,
        }}>An</div>
        <Card t={t} variant="flat" padding="sm" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: t.accentSoft, color: t.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F.display, fontWeight: 800, fontSize: 12,
          }}>FA</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700 }}>Familie & Anhang</div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.4 }}>8 EMPFÄNGER</div>
          </div>
          <span style={{ color: t.textFaint, fontSize: 16 }}>›</span>
        </Card>
      </div>

      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8,
        }}>
          <span style={{
            fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase",
            color: t.textMuted,
          }}>Nachricht</span>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: t.textFaint, letterSpacing: 0.4 }}>184 / 500</span>
        </div>
        <Card t={t} variant="flat" padding="md" style={{ minHeight: 180 }}>
          <div style={{ fontSize: 15, lineHeight: 1.5, textWrap: "pretty" }}>
            Hey Leute, denkt an die Tipps für Mexiko–Südafrika morgen Abend!
            <br /><br />
            Letzter Anpfiff vor der Sondertipp-Deadline. Wer noch keinen Weltmeister gewählt hat → jetzt ist der Moment.
          </div>
        </Card>
      </div>

      {/* Quick chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["📣 Erinnerung", "🎯 Tipp-Tipp", "🏆 Gewinner", "📅 Termin"].map((c) => (
          <span key={c} style={{
            padding: "6px 12px", borderRadius: 999,
            background: t.surface, border: `1px solid ${t.border}`,
            fontFamily: F.body, fontSize: 12, fontWeight: 600, color: t.textMuted,
          }}>{c}</span>
        ))}
      </div>

      {/* Footer toggle */}
      <div style={{
        marginTop: "auto",
        padding: "12px 14px", borderRadius: 14,
        background: t.surface, boxShadow: t.shadowSm,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700 }}>Push-Benachrichtigung</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: t.textMuted, letterSpacing: 0.4, marginTop: 2 }}>
            ALLE 8 MITGLIEDER ERHALTEN PUSH
          </div>
        </div>
        <div style={{
          width: 44, height: 26, borderRadius: 999, background: t.accent,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 999,
            background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>
    </div>
  );
}

window.LeaguesScreen = LeaguesScreen;
window.MyTipsScreen = MyTipsScreen;
window.InboxScreen = InboxScreen;
window.ComposerScreen = ComposerScreen;
