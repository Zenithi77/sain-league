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

const currentYear = new Date().getFullYear();

function yn(val: boolean | null | undefined): string {
  if (val === true) return "Тийм";
  if (val === false) return "Үгүй";
  return "—";
}

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
        if (v !== "" && v !== undefined && v !== null) cleaned[k] = v;
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
        <div className="review-section-title">Ерөнхий мэдээлэл</div>
        <div className="review-item">
          <dt>Аймаг / Хот</dt>
          <dd>{kid.aimag}</dd>
        </div>
        <div className="review-item">
          <dt>Сум / Дүүрэг</dt>
          <dd>{kid.sumDuureg}</dd>
        </div>
        <div className="review-item">
          <dt>Хороо / Баг</dt>
          <dd>{kid.khorooBag}</dd>
        </div>
        <div className="review-item">
          <dt>Овог</dt>
          <dd>{kid.lastName}</dd>
        </div>
        <div className="review-item">
          <dt>Нэр</dt>
          <dd>{kid.firstName}</dd>
        </div>
        <div className="review-item">
          <dt>Төрсөн он</dt>
          <dd>
            {kid.birthYear}{" "}
            {kid.birthYear
              ? `(${currentYear - Number(kid.birthYear)} нас)`
              : ""}
          </dd>
        </div>
        <div className="review-item">
          <dt>Утас</dt>
          <dd>{kid.phone}</dd>
        </div>

        <div className="review-section-title">Сургууль, Анги</div>
        <div className="review-item">
          <dt>Сургууль</dt>
          <dd>{kid.school}</dd>
        </div>
        <div className="review-item">
          <dt>Анги</dt>
          <dd>{kid.grade}-р анги</dd>
        </div>

        <div className="review-section-title">Судалгааны асуулт</div>
        <div className="review-item">
          <dt>Спорт заалтай юу?</dt>
          <dd>{yn(kid.hasGym)}</dd>
        </div>
        <div className="review-item">
          <dt>Сагсан бөмбөгийн хөтөлбөртэй юу?</dt>
          <dd>{yn(kid.hasBasketballProgram)}</dd>
        </div>
        <div className="review-item">
          <dt>Бөмбөгтэй юу?</dt>
          <dd>{yn(kid.hasBalls)}</dd>
        </div>
        <div className="review-item">
          <dt>Онооны цагтай юу?</dt>
          <dd>{yn(kid.hasScoreClock)}</dd>
        </div>
        <div className="review-item">
          <dt>Дасгалжуулагчтай юу?</dt>
          <dd>{yn(kid.hasCoach)}</dd>
        </div>
      </dl>
    );
  }

  function renderCoachSummary() {
    if (!coach) return null;
    return (
      <dl className="review-list">
        <div className="review-section-title">Ерөнхий мэдээлэл</div>
        <div className="review-item">
          <dt>Аймаг / Хот</dt>
          <dd>{coach.aimag}</dd>
        </div>
        <div className="review-item">
          <dt>Сум / Дүүрэг</dt>
          <dd>{coach.sumDuureg}</dd>
        </div>
        <div className="review-item">
          <dt>Хороо / Баг</dt>
          <dd>{coach.khorooBag}</dd>
        </div>
        <div className="review-item">
          <dt>Овог</dt>
          <dd>{coach.lastName}</dd>
        </div>
        <div className="review-item">
          <dt>Нэр</dt>
          <dd>{coach.firstName}</dd>
        </div>
        <div className="review-item">
          <dt>Төрсөн он</dt>
          <dd>
            {coach.birthYear}{" "}
            {coach.birthYear
              ? `(${currentYear - Number(coach.birthYear)} нас)`
              : ""}
          </dd>
        </div>
        <div className="review-item">
          <dt>Утас</dt>
          <dd>{coach.phone}</dd>
        </div>

        <div className="review-section-title">Сургууль, Судалгаа</div>
        <div className="review-item">
          <dt>Сургууль</dt>
          <dd>{coach.school}</dd>
        </div>
        <div className="review-item">
          <dt>Спорт заалтай юу?</dt>
          <dd>{yn(coach.hasGym)}</dd>
        </div>
        <div className="review-item">
          <dt>Сагсан бөмбөгийн хөтөлбөртэй юу?</dt>
          <dd>{yn(coach.hasBasketballProgram)}</dd>
        </div>
        <div className="review-item">
          <dt>Онооны цагтай юу?</dt>
          <dd>{yn(coach.hasScoreClock)}</dd>
        </div>
        <div className="review-item">
          <dt>Мэргэжлийн дасгалжуулагч уу?</dt>
          <dd>{yn(coach.isProfessionalCoach)}</dd>
        </div>
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
