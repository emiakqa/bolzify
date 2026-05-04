// Bolzplatz Primitives — Cards, Buttons, Badges, Pills, Slots
// Alle als reine functional components mit `t = tokens.light|dark` als prop.
// 1:1 portierbar nach RN: ersetze div→View, span→Text, style-keys gleich.

const { bolzFonts: F, bolzSpacing: S, bolzRadius: R, bolzFontSize: FS } = window;

// ── Card ────────────────────────────────────────────────────────────
function Card({ t, variant = "default", padding = "md", onPress, children, style }) {
  const pad = { sm: S.md, md: S.lg, lg: S.xl }[padding] ?? S.lg;
  const base = {
    background: t.surface,
    borderRadius: R.xl,
    padding: pad,
    boxShadow: variant === "elevated" ? t.shadowMd : t.shadowSm,
  };
  const variants = {
    default: { background: t.surface },
    elevated: { background: t.surface, boxShadow: t.shadowLg },
    accent: { background: t.accentSoft, boxShadow: "none", border: `1px solid ${t.accentBorder}` },
    warm: { background: t.warmSoft, boxShadow: "none", border: `1px solid ${t.warmBorder}` },
    flat: { background: t.surface, boxShadow: "none", border: `1px solid ${t.border}` },
  };
  return <div style={{ ...base, ...variants[variant], ...style }}>{children}</div>;
}

// ── Button ──────────────────────────────────────────────────────────
function Button({ t, label, variant = "primary", size = "md", fullWidth, leftIcon, style }) {
  const sizes = {
    sm: { px: S.md, py: S.sm, fs: FS.sm, h: 36 },
    md: { px: S.lg, py: S.md, fs: FS.md, h: 48 },
    lg: { px: S.xl, py: S.lg, fs: FS.lg, h: 56 },
  };
  const sz = sizes[size];
  const variants = {
    primary: { bg: t.accent, fg: t.accentFg, border: "transparent" },
    secondary: { bg: "transparent", fg: t.text, border: t.borderStrong },
    warm: { bg: t.warm, fg: t.warmFg, border: "transparent" },
    ghost: { bg: t.surfaceSunken, fg: t.text, border: "transparent" },
  };
  const v = variants[variant];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: v.bg, color: v.fg, border: `1.5px solid ${v.border}`,
      borderRadius: R.pill, padding: `0 ${sz.px}px`, height: sz.h,
      fontFamily: F.display, fontWeight: 700, fontSize: sz.fs, letterSpacing: -0.2,
      width: fullWidth ? "100%" : "auto",
      boxShadow: variant === "primary" ? t.shadowSm : "none",
      ...style,
    }}>
      {leftIcon}{label}
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────
function Badge({ t, label, tone = "neutral", style }) {
  const tones = {
    neutral: { bg: t.surfaceSunken, fg: t.textMuted, br: t.border },
    accent: { bg: t.accentSoft, fg: t.accent, br: t.accentBorder },
    warm: { bg: t.warmSoft, fg: t.warm, br: t.warmBorder },
    live: { bg: t.liveSoft, fg: t.live, br: t.warmBorder },
    danger: { bg: t.dangerSoft, fg: t.danger, br: "transparent" },
  };
  const v = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: v.bg, color: v.fg,
      border: `1px solid ${v.br}`,
      borderRadius: R.pill, padding: "4px 10px",
      fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      ...style,
    }}>{label}</span>
  );
}

// ── SectionLabel (UPPERCASE Mono) ───────────────────────────────────
function SectionLabel({ t, label, action, style }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      marginBottom: S.sm, ...style,
    }}>
      <span style={{
        fontFamily: F.mono, fontSize: 11, fontWeight: 700,
        letterSpacing: 1.4, textTransform: "uppercase",
        color: t.textMuted,
      }}>{label}</span>
      {action ? (
        <span style={{
          fontFamily: F.body, fontSize: 13, fontWeight: 600, color: t.accent,
        }}>{action} ›</span>
      ) : null}
    </div>
  );
}

// ── FlagSquare (Team-Anker) ─────────────────────────────────────────
function FlagSquare({ gradient, size = 56, radius = 14 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: gradient,
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
    }} />
  );
}

const flagFor = {
  Mexiko: "linear-gradient(90deg, #006847 33%, #ffffff 33% 66%, #ce1126 66%)",
  Südafrika: "linear-gradient(180deg, #007a4d 33%, #ffd700 33% 66%, #de3831 66%)",
  Deutschland: "linear-gradient(180deg, #000 33%, #DD0000 33% 66%, #FFCE00 66%)",
  Brasilien: "linear-gradient(135deg, #009C3B 0%, #FFDF00 50%, #002776 100%)",
  Argentinien: "linear-gradient(180deg, #74ACDF 33%, #FFFFFF 33% 66%, #74ACDF 66%)",
  Frankreich: "linear-gradient(90deg, #0055A4 33%, #FFFFFF 33% 66%, #EF4135 66%)",
  USA: "linear-gradient(180deg, #B22234 0 12%, #FFF 12% 24%, #B22234 24% 36%, #FFF 36% 48%, #B22234 48% 60%, #FFF 60% 72%, #B22234 72%)",
  Spanien: "linear-gradient(180deg, #AA151B 25%, #F1BF00 25% 75%, #AA151B 75%)",
  Niederlande: "linear-gradient(180deg, #AE1C28 33%, #FFFFFF 33% 66%, #21468B 66%)",
  Portugal: "linear-gradient(90deg, #006600 40%, #FF0000 40%)",
  England: "linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 50%, #CE1124 50%, #CE1124 100%)",
  Belgien: "linear-gradient(90deg, #000 33%, #FAE042 33% 66%, #ED2939 66%)",
  Kroatien: "linear-gradient(180deg, #FF0000 33%, #FFFFFF 33% 66%, #171796 66%)",
  Marokko: "linear-gradient(180deg, #C1272D 0%, #C1272D 100%)",
  Japan: "radial-gradient(circle at 50% 50%, #BC002D 0 28%, #FFFFFF 28%)",
  Senegal: "linear-gradient(90deg, #00853F 33%, #FDEF42 33% 66%, #E31B23 66%)",
};

window.B = { Card, Button, Badge, SectionLabel, FlagSquare, flagFor };
