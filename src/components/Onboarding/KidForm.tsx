"use client";

/**
 * KidForm.tsx — Step 1 for kid onboarding.
 * Collects: name, school, grade, whyPlay, phone (optional), seasonId (optional).
 */

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";

export default function KidForm() {
  const kid = useOnboardingStore((s) => s.kid);
  const setKid = useOnboardingStore((s) => s.setKid);
  const setStep = useOnboardingStore((s) => s.setStep);
  const setRole = useOnboardingStore((s) => s.setRole);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!kid?.name?.trim()) e.name = "Нэрээ оруулна уу";
    if (!kid?.school?.trim()) e.school = "Сургуулиа оруулна уу";
    if (!kid?.grade?.trim()) e.grade = "Ангиа оруулна уу";
    if (!kid?.whyPlay?.trim())
      e.whyPlay = "Яагаад тоглохыг хүсч байгаагаа бичнэ үү";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) {
      setStep(2); // go to review
    }
  }

  function handleBack() {
    // Go back to role selection (step 0) — keep answers in store
    setRole("kid"); // re-setting same role resets step to 1, so set step explicitly
    setStep(0);
  }

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-title">Тоглогчийн мэдээлэл</h2>
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
          <label htmlFor="kid-name">Нэр *</label>
          <input
            id="kid-name"
            type="text"
            value={kid?.name ?? ""}
            onChange={(e) => setKid({ name: e.target.value })}
            placeholder="Таны нэр"
            aria-required="true"
            aria-invalid={!!errors.name}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        {/* School */}
        <div className="form-group">
          <label htmlFor="kid-school">Сургууль *</label>
          <input
            id="kid-school"
            type="text"
            value={kid?.school ?? ""}
            onChange={(e) => setKid({ school: e.target.value })}
            placeholder="Жнь: 10-р сургууль"
            aria-required="true"
            aria-invalid={!!errors.school}
          />
          {errors.school && (
            <span className="field-error">{errors.school}</span>
          )}
        </div>

        {/* Grade */}
        <div className="form-group">
          <label htmlFor="kid-grade">Анги *</label>
          <input
            id="kid-grade"
            type="text"
            value={kid?.grade ?? ""}
            onChange={(e) => setKid({ grade: e.target.value })}
            placeholder="Жнь: 9"
            aria-required="true"
            aria-invalid={!!errors.grade}
          />
          {errors.grade && <span className="field-error">{errors.grade}</span>}
        </div>

        {/* Why play */}
        <div className="form-group">
          <label htmlFor="kid-whyPlay">Яагаад тоглохыг хүсч байна вэ? *</label>
          <textarea
            id="kid-whyPlay"
            value={kid?.whyPlay ?? ""}
            onChange={(e) => setKid({ whyPlay: e.target.value })}
            placeholder="Сагсан бөмбөг тоглохыг хүсэж буй шалтгаанаа бичнэ үү"
            rows={3}
            aria-required="true"
            aria-invalid={!!errors.whyPlay}
          />
          {errors.whyPlay && (
            <span className="field-error">{errors.whyPlay}</span>
          )}
        </div>

        {/* Phone (optional) */}
        <div className="form-group">
          <label htmlFor="kid-phone">Утасны дугаар</label>
          <input
            id="kid-phone"
            type="tel"
            value={kid?.phone ?? ""}
            onChange={(e) => setKid({ phone: e.target.value })}
            placeholder="Жнь: 88001122"
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
