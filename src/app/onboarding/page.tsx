"use client";

/**
 * /onboarding page — orchestrates the three onboarding steps.
 *
 * Behaviour:
 *   1. If the user is not logged in → redirect to /login.
 *   2. If the user already has a role (kid, coach, admin) → redirect to /.
 *   3. Otherwise show: ChooseRole → KidForm / CoachForm → ReviewAndSubmit.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStore } from "@/stores/onboardingStore";
import ChooseRole from "@/components/Onboarding/ChooseRole";
import KidForm from "@/components/Onboarding/KidForm";
import CoachForm from "@/components/Onboarding/CoachForm";
import ReviewAndSubmit from "@/components/Onboarding/ReviewAndSubmit";

export default function OnboardingPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const step = useOnboardingStore((s) => s.step);
  const role = useOnboardingStore((s) => s.role);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Auth guards ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // If user already has a meaningful role, skip onboarding
    if (
      userData?.role &&
      userData.role !== "user" // 'user' is the default placeholder role
    ) {
      router.push("/");
    }
  }, [user, userData, loading, router, mounted]);

  // ── Loading / guard rendering ──────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <p>Ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  if (!user) return null; // will redirect

  // ── Step router ────────────────────────────────────────────────────────
  function renderStep() {
    switch (step) {
      case 0:
        return <ChooseRole />;
      case 1:
        return role === "coach" ? <CoachForm /> : <KidForm />;
      case 2:
        return <ReviewAndSubmit />;
      default:
        return <ChooseRole />;
    }
  }

  // ── Progress indicator ─────────────────────────────────────────────────
  const stepLabels = ["Сонголт", "Мэдээлэл", "Шалгах"];

  return (
    <div className="auth-container">
      <div className="onboarding-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">🏀</div>
          <h1>Бүртгэл</h1>
          <p>SAIN Girls League-д тавтай морил!</p>
        </div>

        {/* Progress bar */}
        <div className="onboarding-progress">
          {stepLabels.map((label, i) => (
            <div
              key={label}
              className={`progress-step ${i < step ? "done" : ""} ${i === step ? "active" : ""}`}
            >
              <span className="progress-dot">{i < step ? "✓" : i + 1}</span>
              <span className="progress-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Active step */}
        {renderStep()}
      </div>
    </div>
  );
}
