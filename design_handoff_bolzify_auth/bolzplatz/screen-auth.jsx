// Auth Screens — Login + Registrierung
// Aufbau folgt v0.16 Layout (Logo + Subtitle + 2 Inputs + CTA + Switch-Link),
// aber in Bolzplatz-Direction: Familjen Grotesk Display, JetBrains Mono Caps-Label,
// Tor-Orange Akzent als Joker-Detail, Pill-Inputs mit weichen Schatten (Light)
// bzw. tonalen Surfaces (Dark).

(function () {
  const { B } = window;

  function Field({ t, label, placeholder, value, type = "text", icon }) {
    const F = window.bolzFonts;
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 700,
          letterSpacing: 1.4, textTransform: "uppercase",
          color: t.textMuted, paddingLeft: 4,
        }}>{label}</span>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: "0 16px",
          height: 56,
          boxShadow: t.shadowSm,
        }}>
          {icon ? (
            <span style={{ fontSize: 16, color: t.textMuted, width: 18, textAlign: "center" }}>{icon}</span>
          ) : null}
          <input
            type={type}
            placeholder={placeholder}
            defaultValue={value}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontFamily: F.body, fontSize: 16, fontWeight: 500, color: t.text,
              letterSpacing: -0.1,
            }}
          />
        </div>
      </label>
    );
  }

  function PrimaryCTA({ t, label }) {
    const F = window.bolzFonts;
    return (
      <button style={{
        height: 56, borderRadius: 999, border: "none",
        background: t.accent, color: t.accentFg,
        fontFamily: F.display, fontWeight: 700, fontSize: 17, letterSpacing: -0.2,
        cursor: "pointer", boxShadow: t.shadowSm, width: "100%",
      }}>{label}</button>
    );
  }

  // ── BrandMark — wortmarke + dünner unterstrich-akzent ─────────────
  function BrandMark({ t }) {
    const F = window.bolzFonts;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {/* Wappen-Logo: warmer Kreis mit Inner-Score "B" */}
        <div style={{
          position: "relative", width: 84, height: 84, borderRadius: 999,
          background: `linear-gradient(160deg, ${t.accent} 0%, ${t.accentHover || t.accent} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: t.shadowMd,
        }}>
          <div style={{
            fontFamily: F.display, fontSize: 44, fontWeight: 800, color: t.accentFg,
            letterSpacing: -2, lineHeight: 1, marginTop: -2,
          }}>B</div>
          <div style={{
            position: "absolute", bottom: -6, right: -6,
            width: 26, height: 26, borderRadius: 999,
            background: t.warm, color: t.warmFg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F.mono, fontSize: 11, fontWeight: 700,
            border: `2px solid ${t.bg}`,
          }}>★</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: F.display, fontSize: 44, fontWeight: 800,
            letterSpacing: -1.6, lineHeight: 1, color: t.text,
          }}>Bolzify</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            marginTop: 10, fontFamily: F.mono, fontSize: 10, fontWeight: 700,
            letterSpacing: 1.6, textTransform: "uppercase", color: t.textMuted,
          }}>
            <span style={{ width: 18, height: 1, background: t.borderStrong }} />
            TIPPRUNDE · SAISON 26
            <span style={{ width: 18, height: 1, background: t.borderStrong }} />
          </div>
        </div>
      </div>
    );
  }

  function AuthShell({ t, kicker, headline, sub, fields, ctaLabel, switchPrompt, switchLabel, footer }) {
    const F = window.bolzFonts;
    return (
      <div style={{
        width: "100%", height: "100%", background: t.bg, color: t.text,
        fontFamily: F.body, padding: "60px 24px 40px",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* dezenter top kicker */}
        <div style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 700,
          letterSpacing: 1.6, textTransform: "uppercase",
          color: t.textFaint, textAlign: "center",
        }}>{kicker}</div>

        {/* Brand */}
        <div style={{ marginTop: 36, marginBottom: 28 }}>
          <BrandMark t={t} />
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontFamily: F.display, fontSize: 28, fontWeight: 800,
            letterSpacing: -0.8, lineHeight: 1.1, color: t.text,
          }}>{headline}</div>
          <div style={{
            fontFamily: F.body, fontSize: 14, color: t.textMuted,
            marginTop: 6, lineHeight: 1.5, maxWidth: 280, marginLeft: "auto", marginRight: "auto",
          }}>{sub}</div>
        </div>

        {/* Felder */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 18 }}>
          <PrimaryCTA t={t} label={ctaLabel} />
        </div>

        {/* Switch-Link */}
        <div style={{
          textAlign: "center", marginTop: 18,
          fontFamily: F.body, fontSize: 14, color: t.textMuted,
        }}>
          {switchPrompt} <span style={{ color: t.accent, fontWeight: 700 }}>{switchLabel}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Footer */}
        {footer ? (
          <div style={{
            textAlign: "center",
            fontFamily: F.mono, fontSize: 10, fontWeight: 600,
            letterSpacing: 1.2, textTransform: "uppercase", color: t.textFaint,
          }}>{footer}</div>
        ) : null}
      </div>
    );
  }

  function LoginScreen({ scheme = "light" }) {
    const t = window.bolzTokens[scheme];
    return (
      <AuthShell
        t={t}
        kicker="Anpfiff in Kürze"
        headline="Willkommen zurück."
        sub="Tipp deine Spiele und sieh, wer in deiner Liga vorne liegt."
        fields={[
          <Field key="m" t={t} label="E-Mail" placeholder="anna.b@bolzify.de" icon="✉" />,
          <Field key="p" t={t} label="Passwort" placeholder="••••••••" type="password" icon="🔒" />,
          <div key="forgot" style={{
            textAlign: "right", marginTop: -2,
            fontFamily: window.bolzFonts.body, fontSize: 13, color: t.textMuted,
          }}>Passwort vergessen?</div>,
        ]}
        ctaLabel="Einloggen"
        switchPrompt="Noch kein Konto?"
        switchLabel="Jetzt registrieren ›"
        footer="BOLZIFY v0.17 · MADE FÜR DEN BOLZPLATZ"
      />
    );
  }

  function RegisterScreen({ scheme = "light" }) {
    const t = window.bolzTokens[scheme];
    const F = window.bolzFonts;
    return (
      <AuthShell
        t={t}
        kicker="Neu hier"
        headline="Konto anlegen."
        sub="Username, Mail, Passwort — und du tippst in deiner ersten Liga mit."
        fields={[
          <Field key="u" t={t} label="Username" placeholder="@anna_b" icon="@" />,
          <Field key="m" t={t} label="E-Mail" placeholder="anna.b@bolzify.de" icon="✉" />,
          <Field key="p" t={t} label="Passwort" placeholder="min. 8 Zeichen" type="password" icon="🔒" />,
          <div key="terms" style={{
            display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4, paddingLeft: 4,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6, marginTop: 1,
              background: t.accent, color: t.accentFg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800,
            }}>✓</div>
            <div style={{
              flex: 1, fontFamily: F.body, fontSize: 12, color: t.textMuted, lineHeight: 1.5,
            }}>
              Ich akzeptiere die <span style={{ color: t.text, fontWeight: 600 }}>AGB</span> und
              <span> </span>
              <span style={{ color: t.text, fontWeight: 600 }}>Datenschutzerklärung</span>.
            </div>
          </div>,
        ]}
        ctaLabel="Registrieren"
        switchPrompt="Schon ein Konto?"
        switchLabel="Einloggen ›"
        footer="KEINE WERBUNG · KEIN ECHTGELD · NUR EHRE"
      />
    );
  }

  window.LoginScreen = LoginScreen;
  window.RegisterScreen = RegisterScreen;
})();
