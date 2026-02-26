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

      <div className="role-cards">
        {/* ── Kid card ── */}
        <button
          type="button"
          className="role-card"
          onClick={() => setRole("kid")}
          aria-label="Тоглогч (сурагч) гэж бүртгүүлэх"
        >
          <span className="role-icon">🏀</span>
          <span className="role-label">Тоглогч</span>
          <span className="role-desc">
            Би сагсан бөмбөг тоглохыг хүсч байна
          </span>
        </button>

        {/* ── Coach card ── */}
        <button
          type="button"
          className="role-card"
          onClick={() => setRole("coach")}
          aria-label="Дасгалжуулагч гэж бүртгүүлэх"
        >
          <span className="role-icon">📋</span>
          <span className="role-label">Дасгалжуулагч</span>
          <span className="role-desc">Би багийг удирдахыг хүсч байна</span>
        </button>
      </div>
    </div>
  );
}
