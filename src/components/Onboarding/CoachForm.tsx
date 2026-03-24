"use client";

/**
 * CoachForm.tsx — Step 1 for coach onboarding.
 *
 * Sections:
 *   A] General info: location (cascading), lastName, firstName, birthYear, phone
 *   B] School + Yes/No research questions (4 questions)
 */

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  aimagList,
  getSumDuureg,
  getKhorooBag,
} from "@/data/mongoliaLocations";
import { schoolList } from "@/data/schools";

const currentYear = new Date().getFullYear();

export default function CoachForm() {
  const coach = useOnboardingStore((s) => s.coach);
  const setCoach = useOnboardingStore((s) => s.setCoach);
  const setStep = useOnboardingStore((s) => s.setStep);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Derived location lists ─────────────────────────────────────────────
  const sumList = coach?.aimag ? getSumDuureg(coach.aimag) : [];
  const khorooList =
    coach?.aimag && coach?.sumDuureg
      ? getKhorooBag(coach.aimag, coach.sumDuureg)
      : [];

  // ── Validation ─────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!coach?.aimag) e.aimag = "Аймаг/хот сонгоно уу";
    if (!coach?.sumDuureg) e.sumDuureg = "Сум/дүүрэг сонгоно уу";
    if (!coach?.khorooBag) e.khorooBag = "Хороо/баг сонгоно уу";
    if (!coach?.lastName?.trim()) e.lastName = "Овгоо оруулна уу";
    if (!coach?.firstName?.trim()) e.firstName = "Нэрээ оруулна уу";
    if (!coach?.birthYear) {
      e.birthYear = "Төрсөн оноо оруулна уу";
    } else if (
      Number(coach.birthYear) < 1950 ||
      Number(coach.birthYear) > currentYear - 16
    ) {
      e.birthYear = "Зөв төрсөн он оруулна уу";
    }
    if (!coach?.phone?.trim()) e.phone = "Утасны дугаар оруулна уу";
    if (!coach?.school) e.school = "Сургуулиа сонгоно уу";
    if (coach?.hasGym === null) e.hasGym = "Сонгоно уу";
    if (coach?.hasBasketballProgram === null)
      e.hasBasketballProgram = "Сонгоно уу";
    if (coach?.hasScoreClock === null) e.hasScoreClock = "Сонгоно уу";
    if (coach?.isProfessionalCoach === null)
      e.isProfessionalCoach = "Сонгоно уу";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) setStep(2);
  }

  function handleBack() {
    setStep(0);
  }

  // ── Yes/No toggle helper ───────────────────────────────────────────────
  function YesNo({ field, value }: { field: string; value: boolean | null }) {
    return (
      <div className="yes-no-group">
        <button
          type="button"
          className={`yes-no-btn ${value === true ? "active yes" : ""}`}
          onClick={() => setCoach({ [field]: true })}
        >
          Тийм
        </button>
        <button
          type="button"
          className={`yes-no-btn ${value === false ? "active no" : ""}`}
          onClick={() => setCoach({ [field]: false })}
        >
          Үгүй
        </button>
      </div>
    );
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
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* A] General Information                                        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <fieldset className="onboarding-fieldset">
          <legend>Ерөнхий мэдээлэл</legend>

          {/* Аймаг / Хот */}
          <div className="form-group">
            <label htmlFor="coach-aimag">Аймаг / Хот *</label>
            <select
              id="coach-aimag"
              value={coach?.aimag ?? ""}
              onChange={(e) =>
                setCoach({
                  aimag: e.target.value,
                  sumDuureg: "",
                  khorooBag: "",
                })
              }
              aria-required="true"
              aria-invalid={!!errors.aimag}
            >
              <option value="">-- Сонгоно уу --</option>
              {aimagList.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            {errors.aimag && (
              <span className="field-error">{errors.aimag}</span>
            )}
          </div>

          {/* Сум / Дүүрэг */}
          <div className="form-group">
            <label htmlFor="coach-sum">Сум / Дүүрэг *</label>
            <select
              id="coach-sum"
              value={coach?.sumDuureg ?? ""}
              onChange={(e) =>
                setCoach({ sumDuureg: e.target.value, khorooBag: "" })
              }
              disabled={!coach?.aimag}
              aria-required="true"
              aria-invalid={!!errors.sumDuureg}
            >
              <option value="">-- Сонгоно уу --</option>
              {sumList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.sumDuureg && (
              <span className="field-error">{errors.sumDuureg}</span>
            )}
          </div>

          {/* Хороо / Баг */}
          <div className="form-group">
            <label htmlFor="coach-khoroo">Хороо / Баг *</label>
            <select
              id="coach-khoroo"
              value={coach?.khorooBag ?? ""}
              onChange={(e) => setCoach({ khorooBag: e.target.value })}
              disabled={!coach?.sumDuureg}
              aria-required="true"
              aria-invalid={!!errors.khorooBag}
            >
              <option value="">-- Сонгоно уу --</option>
              {khorooList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            {errors.khorooBag && (
              <span className="field-error">{errors.khorooBag}</span>
            )}
          </div>

          {/* Овог */}
          <div className="form-group">
            <label htmlFor="coach-lastName">Овог *</label>
            <input
              id="coach-lastName"
              type="text"
              value={coach?.lastName ?? ""}
              onChange={(e) => setCoach({ lastName: e.target.value })}
              placeholder="Овог"
              aria-required="true"
              aria-invalid={!!errors.lastName}
            />
            {errors.lastName && (
              <span className="field-error">{errors.lastName}</span>
            )}
          </div>

          {/* Нэр */}
          <div className="form-group">
            <label htmlFor="coach-firstName">Нэр *</label>
            <input
              id="coach-firstName"
              type="text"
              value={coach?.firstName ?? ""}
              onChange={(e) => setCoach({ firstName: e.target.value })}
              placeholder="Нэр"
              aria-required="true"
              aria-invalid={!!errors.firstName}
            />
            {errors.firstName && (
              <span className="field-error">{errors.firstName}</span>
            )}
          </div>

          {/* Төрсөн он */}
          <div className="form-group">
            <label htmlFor="coach-birthYear">Төрсөн он *</label>
            <input
              id="coach-birthYear"
              type="number"
              min={1950}
              max={currentYear - 16}
              value={coach?.birthYear ?? ""}
              onChange={(e) =>
                setCoach({
                  birthYear: e.target.value ? Number(e.target.value) : "",
                })
              }
              placeholder="Жнь: 1990"
              aria-required="true"
              aria-invalid={!!errors.birthYear}
            />
            {coach?.birthYear && (
              <span className="field-hint">
                Нас: {currentYear - Number(coach.birthYear)}
              </span>
            )}
            {errors.birthYear && (
              <span className="field-error">{errors.birthYear}</span>
            )}
          </div>

          {/* Утас */}
          <div className="form-group">
            <label htmlFor="coach-phone">Холбогдох утасны дугаар *</label>
            <input
              id="coach-phone"
              type="tel"
              value={coach?.phone ?? ""}
              onChange={(e) => setCoach({ phone: e.target.value })}
              placeholder="Жнь: 99001122"
              aria-required="true"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <span className="field-error">{errors.phone}</span>
            )}
          </div>
        </fieldset>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* B] School + Yes/No Research Questions                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <fieldset className="onboarding-fieldset">
          <legend>Сургууль, Судалгаа</legend>

          {/* Сургууль */}
          <div className="form-group">
            <label htmlFor="coach-school">Ямар сургуульд багшилдаг вэ? *</label>
            <select
              id="coach-school"
              value={coach?.school ?? ""}
              onChange={(e) => setCoach({ school: e.target.value })}
              aria-required="true"
              aria-invalid={!!errors.school}
            >
              <option value="">-- Сонгоно уу --</option>
              {schoolList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.school && (
              <span className="field-error">{errors.school}</span>
            )}
          </div>

          <div className="form-group">
            <label>Танай сургууль зориулалтын спорт заалтай юу? *</label>
            <YesNo field="hasGym" value={coach?.hasGym ?? null} />
            {errors.hasGym && (
              <span className="field-error">{errors.hasGym}</span>
            )}
          </div>

          <div className="form-group">
            <label>
              Танай сургууль сагсан бөмбөгийн сургалтын хөтөлбөртэй юу? *
            </label>
            <YesNo
              field="hasBasketballProgram"
              value={coach?.hasBasketballProgram ?? null}
            />
            {errors.hasBasketballProgram && (
              <span className="field-error">{errors.hasBasketballProgram}</span>
            )}
          </div>

          <div className="form-group">
            <label>Сагсан бөмбөгийн тэмцээний онооны цагтай юу? *</label>
            <YesNo field="hasScoreClock" value={coach?.hasScoreClock ?? null} />
            {errors.hasScoreClock && (
              <span className="field-error">{errors.hasScoreClock}</span>
            )}
          </div>

          <div className="form-group">
            <label>Та мэргэжлийн сагсан бөмбөгийн дасгалжуулагч уу? *</label>
            <YesNo
              field="isProfessionalCoach"
              value={coach?.isProfessionalCoach ?? null}
            />
            {errors.isProfessionalCoach && (
              <span className="field-error">{errors.isProfessionalCoach}</span>
            )}
          </div>
        </fieldset>

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
