"use client";

/**
 * AuthShell — shared split-screen layout for the auth pages
 * (login / signup / onboarding).
 *
 * Left: dark SAIN.LEAGUE brand panel with court rings, a dribbling
 * basketball and league stat chips.  Right: white form panel that
 * receives the page content as children.  Purely presentational —
 * no auth logic lives here.
 */

import Link from "next/link";

export default function AuthShell({
  eyebrow,
  title,
  lead,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="sgl-auth-wrap">
      {/* background blobs */}
      <div
        className="sgl-hero-blob"
        style={{
          top: -90,
          left: -70,
          width: 360,
          height: 360,
          background:
            "radial-gradient(circle,rgba(241,95,34,.18),transparent 68%)",
          animation: "sgl-blob 15s ease-in-out infinite",
        }}
      />
      <div
        className="sgl-hero-blob"
        style={{
          bottom: -110,
          right: -80,
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle,rgba(32,196,244,.16),transparent 68%)",
          animation: "sgl-blob 19s ease-in-out infinite reverse",
        }}
      />

      <div className={`sgl-auth-card ${wide ? "wide" : ""}`}>
        {/* ── BRAND PANEL ── */}
        <div className="sgl-auth-brand">
          <div
            style={{
              position: "absolute",
              right: -50,
              top: -60,
              width: 230,
              height: 230,
              border: "30px solid rgba(241,95,34,.14)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -40,
              bottom: -70,
              width: 190,
              height: 190,
              border: "24px solid rgba(32,196,244,.1)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 60,
              top: 110,
              width: 120,
              height: 120,
              border: "2px dashed rgba(255,255,255,.14)",
              borderRadius: "50%",
              animation: "sgl-spin-slow 40s linear infinite",
            }}
          />

          <div style={{ position: "relative", zIndex: 2 }}>
            {/* wordmark */}
            <Link
              href="/"
              style={{ display: "inline-flex", alignItems: "center", gap: 11 }}
            >
              <span
                style={{
                  position: "relative",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 30%,#FF8244,#E0490F)",
                  display: "inline-block",
                  boxShadow: "0 6px 16px -4px rgba(241,95,34,.6)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    width: 2,
                    height: "100%",
                    background: "rgba(0,0,0,.4)",
                    transform: "translateX(-50%)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    width: "100%",
                    height: 2,
                    background: "rgba(0,0,0,.4)",
                    transform: "translateY(-50%)",
                  }}
                />
              </span>
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: 1,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--sgl-head)",
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: 0.5,
                    color: "#fff",
                  }}
                >
                  SAIN<span style={{ color: "#F15F22" }}>.</span>LEAGUE
                </span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: 3,
                    color: "#9A9AA4",
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  GIRLS BASKETBALL
                </span>
              </span>
            </Link>

            {/* eyebrow */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                marginTop: 36,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.12)",
                padding: "7px 15px",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#F15F22",
                  animation: "sgl-pulse-dot 1.8s infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#FF8244",
                }}
              >
                {eyebrow}
              </span>
            </div>

            <h1
              style={{
                fontFamily: "var(--sgl-head)",
                fontWeight: 700,
                fontSize: 44,
                lineHeight: 0.98,
                letterSpacing: 0.5,
                color: "#fff",
                margin: "16px 0 0",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "#9A9AA4",
                fontWeight: 500,
                maxWidth: 300,
                marginTop: 14,
              }}
            >
              {lead}
            </p>

            {/* stat chips */}
            <div
              style={{
                display: "flex",
                gap: 9,
                flexWrap: "wrap",
                marginTop: 26,
              }}
            >
              {[
                { v: "16", l: "БАГ" },
                { v: "200+", l: "ТОГЛОГЧ" },
                { v: "2026", l: "УЛИРАЛ" },
              ].map((s) => (
                <span
                  key={s.l}
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 6,
                    background: "rgba(255,255,255,.07)",
                    borderRadius: 12,
                    padding: "8px 14px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--sgl-head)",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1,
                    }}
                  >
                    {s.v}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: "#7A7A86",
                    }}
                  >
                    {s.l}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* dribbling ball */}
          <div className="sgl-auth-ball">
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                width: 2,
                height: "100%",
                background: "rgba(80,20,0,.5)",
                transform: "translateX(-50%)",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: "100%",
                height: 2,
                background: "rgba(80,20,0,.5)",
                transform: "translateY(-50%)",
              }}
            />
          </div>
        </div>

        {/* ── FORM PANEL ── */}
        <div className="sgl-auth-form-panel">{children}</div>
      </div>
    </div>
  );
}
