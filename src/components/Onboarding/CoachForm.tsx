"use client";

/**
 * CoachForm.tsx — Step 1 for coach onboarding.
 * Collects: name, school, hasGym, hasBalls, hasScoreboard,
 *           programAvailable, scorePointerClock, notes, seasonId.
 */

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";

export default function CoachForm() {
  const coach = useOnboardingStore((s) => s.coach);
  const setCoach = useOnboardingStore((s) => s.setCoach);
  const setStep = useOnboardingStore((s) => s.setStep);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!coach?.name?.trim()) e.name = "Нэрээ оруулна уу";
    if (!coach?.school?.trim()) e.school = "Сургуулиа оруулна уу";
    if (typeof coach?.hasGym !== "boolean")
      e.hasGym = "Заал байгаа эсэхийг сонгоно уу";
    if (typeof coach?.hasBalls !== "boolean")
      e.hasBalls = "Бөмбөг байгаа эсэхийг сонгоно уу";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) {
      setStep(2);
    }
  }

  function handleBack() {
    setStep(0);
  }

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-title">Дасгалжуулагчийн мэдээлэл</h2>
      <p className="onboarding-subtitle">Доорх мэдээллээ бөглөнө үү</p>

      <form
        className="onboarding-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleNext();
        }}
        noValidate
      >
        {/* Name */}
        <div className="form-group">
          <label htmlFor="coach-name">Нэр *</label>
          <input
            id="coach-name"
            type="text"
            value={coach?.name ?? ""}
            onChange={(e) => setCoach({ name: e.target.value })}
            placeholder="Таны нэр"
            aria-required="true"
            aria-invalid={!!errors.name}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        {/* School */}
        <div className="form-group">
          <label htmlFor="coach-school">Сургууль *</label>
          <input
            id="coach-school"
            type="text"
            value={coach?.school ?? ""}
            onChange={(e) => setCoach({ school: e.target.value })}
            placeholder="Жнь: 10-р сургууль"
            aria-required="true"
            aria-invalid={!!errors.school}
          />
          {errors.school && (
            <span className="field-error">{errors.school}</span>
          )}
        </div>

        {/* Has gym */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={coach?.hasGym ?? false}
              onChange={(e) => setCoach({ hasGym: e.target.checked })}
              aria-required="true"
            />
            <span>Заалтай юу? *</span>
          </label>
          {errors.hasGym && (
            <span className="field-error">{errors.hasGym}</span>
          )}
        </div>

        {/* Has balls */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={coach?.hasBalls ?? false}
              onChange={(e) => setCoach({ hasBalls: e.target.checked })}
              aria-required="true"
            />
            <span>Бөмбөгтэй юу? *</span>
          </label>
          {errors.hasBalls && (
            <span className="field-error">{errors.hasBalls}</span>
          )}
        </div>

        {/* Has scoreboard */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={coach?.hasScoreboard ?? false}
              onChange={(e) => setCoach({ hasScoreboard: e.target.checked })}
            />
            <span>Оноо самбартай юу?</span>
          </label>
        </div>

        {/* Program available */}
        <div className="form-group">
          <label htmlFor="coach-program">Хөтөлбөр / curriculum</label>
          <input
            id="coach-program"
            type="text"
            value={coach?.programAvailable ?? ""}
            onChange={(e) => setCoach({ programAvailable: e.target.value })}
            placeholder="Жнь: Тийм — анхан шатны хөтөлбөр"
          />
        </div>

        {/* Score / pointer / clock */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={coach?.scorePointerClock ?? false}
              onChange={(e) =>
                setCoach({ scorePointerClock: e.target.checked })
              }
            />
            <span>Score pointer / clock байгаа юу?</span>
          </label>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="coach-notes">Нэмэлт тэмдэглэл</label>
          <textarea
            id="coach-notes"
            value={coach?.notes ?? ""}
            onChange={(e) => setCoach({ notes: e.target.value })}
            placeholder="Жнь: Сургалтын төлөвлөгөөнд тусламж хэрэгтэй"
            rows={3}
          />
        </div>

        {/* Buttons */}
        <div className="onboarding-actions">
          <button
            type="button"
            className="auth-btn google"
            onClick={handleBack}
          >
            ← Буцах
          </button>
          <button type="submit" className="auth-btn primary">
            Үргэлжлүүлэх →
          </button>
        </div>
      </form>
    </div>
  );
}
