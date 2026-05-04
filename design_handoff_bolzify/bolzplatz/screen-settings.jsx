// Settings — gruppierte Liste, Profil-Hero oben, Logout am Ende.

function SettingsScreen({ scheme = "light" }) {
  const t = window.bolzTokens[scheme];
  const F = window.bolzFonts;
  const { Card, Button, Badge } = window.B;

  const Group = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
        textTransform: "uppercase", color: t.textMuted, marginBottom: 8, paddingLeft: 4,
      }}>{label}</div>
      <Card t={t} variant="flat" padding="sm" style={{ padding: 0, overflow: "hidden" }}>
        {children}
      </Card>
    </div>
  );

  const Row = ({ icon, label, value, toggle, last, danger }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: last ? "none" : `1px solid ${t.divider}`,
    }}>
      {icon ? (
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: danger ? t.dangerSoft : t.accentSoft,
          color: danger ? t.danger : t.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
        }}>{icon}</div>
      ) : null}
      <span style={{
        flex: 1, fontFamily: F.body, fontSize: 14, fontWeight: 500,
        color: danger ? t.danger : t.text,
      }}>{label}</span>
      {toggle ? (
        <div style={{
          width: 44, height: 26, borderRadius: 999, background: toggle === "on" ? t.accent : t.borderStrong,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 3, left: toggle === "on" ? 21 : 3,
            width: 20, height: 20, borderRadius: 999, background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }} />
        </div>
      ) : value ? (
        <span style={{ fontFamily: F.mono, fontSize: 12, color: t.textMuted, letterSpacing: 0.3 }}>{value}</span>
      ) : !danger ? (
        <span style={{ color: t.textFaint, fontSize: 16 }}>›</span>
      ) : null}
    </div>
  );

  return (
    <div style={{
      width: "100%", height: "100%", background: t.bg, color: t.text,
      fontFamily: F.body, padding: "60px 20px 40px",
      display: "flex", flexDirection: "column", overflow: "auto",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ color: t.textMuted, fontSize: 14 }}>‹ Zurück</span>
        <span style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700 }}>Einstellungen</span>
        <span style={{ width: 50 }} />
      </div>

      {/* Profil-Hero */}
      <Card t={t} variant="elevated" padding="lg" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999,
            background: `linear-gradient(135deg, ${t.accent}, ${t.warm})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: F.display, fontSize: 24, fontWeight: 800,
          }}>AB</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>@anna_b</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: t.textMuted, marginTop: 2 }}>anna.b@bolzify.de</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <Badge t={t} label="2 LIGEN" tone="neutral" />
              <Badge t={t} label="47 PKT" tone="accent" />
            </div>
          </div>
        </div>
      </Card>

      <Group label="Account">
        <Row icon="👤" label="Profil bearbeiten" />
        <Row icon="✉" label="E-Mail ändern" value="anna.b@…" />
        <Row icon="🔒" label="Passwort" last />
      </Group>

      <Group label="Benachrichtigungen">
        <Row icon="🔔" label="Push aktiviert" toggle="on" />
        <Row icon="⏰" label="Tipp-Erinnerungen" toggle="on" />
        <Row icon="📣" label="Liga-Broadcasts" toggle="on" />
        <Row icon="📊" label="Wochen-Zusammenfassung" toggle="off" last />
      </Group>

      <Group label="Darstellung">
        <Row icon="◐" label="Theme" value="System" />
        <Row icon="🇩🇪" label="Sprache" value="Deutsch" last />
      </Group>

      <Group label="Über">
        <Row icon="?" label="Punkte-Regeln" />
        <Row icon="§" label="Datenschutz" />
        <Row icon="◯" label="Impressum" last />
      </Group>

      <Group label="Konto">
        <Row icon="↪" label="Abmelden" danger last />
      </Group>

      <div style={{
        textAlign: "center", marginTop: 8,
        fontFamily: F.mono, fontSize: 10, color: t.textFaint, letterSpacing: 0.6,
      }}>BOLZIFY v0.17 · BUILD 248</div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
