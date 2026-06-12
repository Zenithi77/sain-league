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
      <div className="sgl-onb-wrap">
        <p style={{ textAlign: "center", padding: 60, color: "var(--sgl-muted)" }}>
          Ачааллаж байна...
        </p>
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
    <div className="sgl-onb-wrap">
      {/* background blobs */}
      <div
        className="sgl-hero-blob"
        style={{
          top: -80,
          left: -60,
          width: 340,
          height: 340,
          background: "radial-gradient(circle,rgba(241,95,34,.16),transparent 68%)",
          animation: "sgl-blob 15s ease-in-out infinite",
        }}
      />
      <div
        className="sgl-hero-blob"
        style={{
          bottom: -100,
          right: -70,
          width: 380,
          height: 380,
          background: "radial-gradient(circle,rgba(32,196,244,.14),transparent 68%)",
          animation: "sgl-blob 18s ease-in-out infinite reverse",
        }}
      />

      <div className="sgl-onb-card">
        {/* gradient top bar */}
        <div
          style={{
            height: 6,
            background: "linear-gradient(90deg,#F15F22,#20C4F4,#0072BC)",
          }}
        />

        <div className="sgl-onb-inner">
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                background: "#fff",
                border: "1px solid rgba(241,95,34,.25)",
                padding: "7px 15px",
                borderRadius: 999,
                boxShadow: "0 8px 22px -14px rgba(241,95,34,.6)",
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
                  color: "#F15F22",
                }}
              >
                Sain Girls League
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--sgl-head)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: "var(--sgl-ink)",
                margin: "14px 0 6px",
              }}
            >
              БҮРТГЭЛ
            </h1>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--sgl-muted-2)" }}>
              SAIN Girls League-д тавтай морил!
            </p>
          </div>

          {/* Progress stepper */}
          <div className="sgl-onb-stepper">
            {stepLabels.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? 1 : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: "none" }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--sgl-head)",
                        fontSize: 15,
                        fontWeight: 700,
                        background: done
                          ? "#1F9E5A"
                          : active
                            ? "#F15F22"
                            : "#fff",
                        color: done || active ? "#fff" : "var(--sgl-muted)",
                        border: done || active ? "none" : "1.5px solid rgba(23,23,31,.12)",
                        boxShadow: active ? "0 10px 22px -10px rgba(241,95,34,.8)" : "none",
                        transition: "all .25s ease",
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        color: active ? "var(--sgl-ink)" : "var(--sgl-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <span
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 999,
                        margin: "0 10px 18px",
                        background: i < step ? "#1F9E5A" : "rgba(23,23,31,.08)",
                        transition: "background .25s ease",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Active step */}
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
