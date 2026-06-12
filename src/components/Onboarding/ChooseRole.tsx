"use client";

/**
 * ChooseRole.tsx — Step 0 of the onboarding flow.
 * User picks whether they are a "kid" (player) or "coach".
 */

import { useOnboardingStore } from "@/stores/onboardingStore";

export default function ChooseRole() {
  const setRole = useOnboardingStore((s) => s.setRole);

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-title">Та хэн бэ?</h2>
      <p className="onboarding-subtitle">Өөрт тохирох сонголтыг сонгоно уу</p>

      <div className="sgl-role-cards">
        {/* ── Kid card ── */}
        <button
          type="button"
          className="sgl-role-card"
          onClick={() => setRole("kid")}
          aria-label="Тоглогч (сурагч) гэж бүртгүүлэх"
          style={{ "--role-color": "#F15F22", "--role-color2": "#FF8244" } as React.CSSProperties}
        >
          <span className="sgl-role-ring" />
          <span className="sgl-role-icon">
            {/* basketball */}
            <span
              style={{
                position: "relative",
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%,#FF8E54,#E0490F)",
                display: "inline-block",
                boxShadow: "0 10px 20px -8px rgba(224,73,15,.7)",
              }}
            >
              <span style={{ position: "absolute", left: "50%", top: 0, width: 2, height: "100%", background: "rgba(80,20,0,.5)", transform: "translateX(-50%)" }} />
              <span style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 2, background: "rgba(80,20,0,.5)", transform: "translateY(-50%)" }} />
            </span>
          </span>
          <span className="sgl-role-label">Тоглогч</span>
          <span className="sgl-role-desc">Би сагсан бөмбөг тоглохыг хүсч байна</span>
          <span className="sgl-role-cta">Сонгох →</span>
        </button>

        {/* ── Coach card ── */}
        <button
          type="button"
          className="sgl-role-card"
          onClick={() => setRole("coach")}
          aria-label="Дасгалжуулагч гэж бүртгүүлэх"
          style={{ "--role-color": "#0072BC", "--role-color2": "#20C4F4" } as React.CSSProperties}
        >
          <span className="sgl-role-ring" />
          <span className="sgl-role-icon">
            {/* clipboard / play-board */}
            <span
              style={{
                position: "relative",
                width: 40,
                height: 46,
                borderRadius: 10,
                background: "linear-gradient(135deg,#0072BC,#20C4F4)",
                display: "inline-block",
                boxShadow: "0 10px 20px -8px rgba(0,114,188,.6)",
              }}
            >
              <span style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", width: 16, height: 9, borderRadius: 4, background: "#17171F" }} />
              <span style={{ position: "absolute", top: 12, left: 8, right: 8, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,.75)" }} />
              <span style={{ position: "absolute", top: 20, left: 8, right: 14, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,.55)" }} />
              <span style={{ position: "absolute", top: 28, left: 8, right: 18, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,.35)" }} />
            </span>
          </span>
          <span className="sgl-role-label">Дасгалжуулагч</span>
          <span className="sgl-role-desc">Би багийг удирдахыг хүсч байна</span>
          <span className="sgl-role-cta">Сонгох →</span>
        </button>
      </div>
    </div>
  );
}
