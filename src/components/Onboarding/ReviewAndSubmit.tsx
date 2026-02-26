"use client";

/**
 * ReviewAndSubmit.tsx — Step 2 of the onboarding flow.
 * Shows a summary of all answers and a Submit button that calls the
 * backend POST /saveOnboarding.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { saveOnboarding } from "@/utils/api";

export default function ReviewAndSubmit() {
  const { role, kid, coach, setStep, clear } = useOnboardingStore();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const answers = role === "kid" ? kid : coach;

  async function handleSubmit() {
    if (!role || !answers) return;
    setError("");
    setSubmitting(true);

    try {
      // Strip empty optional fields to keep the payload clean
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(answers)) {
        if (v !== "" && v !== undefined) cleaned[k] = v;
      }

      await saveOnboarding({ role, answers: cleaned });

      // Success — clear local state and go to the main app
      clear();
      router.push("/");
    } catch (err: unknown) {
      console.error("[onboarding submit]", err);
      setError(
        err instanceof Error
          ? err.message
          : "Серверийн алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────
  function renderKidSummary() {
    if (!kid) return null;
    return (
      <dl className="review-list">
        <div className="review-item">
          <dt>Нэр</dt>
          <dd>{kid.name}</dd>
        </div>
        <div className="review-item">
          <dt>Сургууль</dt>
          <dd>{kid.school}</dd>
        </div>
        <div className="review-item">
          <dt>Анги</dt>
          <dd>{kid.grade}</dd>
        </div>
        <div className="review-item">
          <dt>Яагаад тоглохыг хүсч байна вэ?</dt>
          <dd>{kid.whyPlay}</dd>
        </div>
        {kid.phone && (
          <div className="review-item">
            <dt>Утас</dt>
            <dd>{kid.phone}</dd>
          </div>
        )}
      </dl>
    );
  }

  function renderCoachSummary() {
    if (!coach) return null;
    return (
      <dl className="review-list">
        <div className="review-item">
          <dt>Нэр</dt>
          <dd>{coach.name}</dd>
        </div>
        <div className="review-item">
          <dt>Сургууль</dt>
          <dd>{coach.school}</dd>
        </div>
        <div className="review-item">
          <dt>Заалтай юу?</dt>
          <dd>{coach.hasGym ? "Тийм" : "Үгүй"}</dd>
        </div>
        <div className="review-item">
          <dt>Бөмбөгтэй юу?</dt>
          <dd>{coach.hasBalls ? "Тийм" : "Үгүй"}</dd>
        </div>
        <div className="review-item">
          <dt>Оноо самбартай юу?</dt>
          <dd>{coach.hasScoreboard ? "Тийм" : "Үгүй"}</dd>
        </div>
        {coach.programAvailable && (
          <div className="review-item">
            <dt>Хөтөлбөр</dt>
            <dd>{coach.programAvailable}</dd>
          </div>
        )}
        {coach.scorePointerClock !== undefined && (
          <div className="review-item">
            <dt>Score pointer / clock</dt>
            <dd>{coach.scorePointerClock ? "Тийм" : "Үгүй"}</dd>
          </div>
        )}
        {coach.notes && (
          <div className="review-item">
            <dt>Тэмдэглэл</dt>
            <dd>{coach.notes}</dd>
          </div>
        )}
      </dl>
    );
  }

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-title">Мэдээллээ шалгана уу</h2>
      <p className="onboarding-subtitle">
        Та <strong>{role === "kid" ? "Тоглогч" : "Дасгалжуулагч"}</strong> гэж
        бүртгүүлж байна
      </p>

      {role === "kid" ? renderKidSummary() : renderCoachSummary()}

      {error && <div className="auth-error">{error}</div>}

      <div className="onboarding-actions">
        <button
          type="button"
          className="auth-btn google"
          onClick={() => setStep(1)}
          disabled={submitting}
        >
          ← Засах
        </button>
        <button
          type="button"
          className="auth-btn primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Илгээж байна..." : "Илгээх ✓"}
        </button>
      </div>
    </div>
  );
}
