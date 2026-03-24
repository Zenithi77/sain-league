"use client";

/**
 * KidForm.tsx — Step 1 for kid onboarding.
 *
 * Sections:
 *   A] General info: location (cascading), lastName, firstName, birthYear, phone
 *   B] School & grade: school (selector), grade (1-12)
 *   C] Yes/No research questions (5 questions)
 */

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  aimagList,
  getSumDuureg,
  getKhorooBag,
} from "@/data/mongoliaLocations";
import { schoolList } from "@/data/schools";

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();

export default function KidForm() {
  const kid = useOnboardingStore((s) => s.kid);
  const setKid = useOnboardingStore((s) => s.setKid);
  const setStep = useOnboardingStore((s) => s.setStep);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Derived location lists ─────────────────────────────────────────────
  const sumList = kid?.aimag ? getSumDuureg(kid.aimag) : [];
  const khorooList =
    kid?.aimag && kid?.sumDuureg ? getKhorooBag(kid.aimag, kid.sumDuureg) : [];

  // ── Validation ─────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!kid?.aimag) e.aimag = "Аймаг/хот сонгоно уу";
    if (!kid?.sumDuureg) e.sumDuureg = "Сум/дүүрэг сонгоно уу";
    if (!kid?.khorooBag) e.khorooBag = "Хороо/баг сонгоно уу";
    if (!kid?.lastName?.trim()) e.lastName = "Овгоо оруулна уу";
    if (!kid?.firstName?.trim()) e.firstName = "Нэрээ оруулна уу";
    if (!kid?.birthYear) {
      e.birthYear = "Төрсөн оноо оруулна уу";
    } else if (
      Number(kid.birthYear) < 1990 ||
      Number(kid.birthYear) > currentYear - 4
    ) {
      e.birthYear = "Зөв төрсөн он оруулна уу";
    }
    if (!kid?.phone?.trim()) e.phone = "Утасны дугаар оруулна уу";
    if (!kid?.school) e.school = "Сургуулиа сонгоно уу";
    if (!kid?.grade) e.grade = "Ангиа сонгоно уу";
    if (kid?.hasGym === null) e.hasGym = "Сонгоно уу";
    if (kid?.hasBasketballProgram === null)
      e.hasBasketballProgram = "Сонгоно уу";
    if (kid?.hasBalls === null) e.hasBalls = "Сонгоно уу";
    if (kid?.hasScoreClock === null) e.hasScoreClock = "Сонгоно уу";
    if (kid?.hasCoach === null) e.hasCoach = "Сонгоно уу";
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
          onClick={() => setKid({ [field]: true })}
        >
          Тийм
        </button>
        <button
          type="button"
          className={`yes-no-btn ${value === false ? "active no" : ""}`}
          onClick={() => setKid({ [field]: false })}
        >
          Үгүй
        </button>
      </div>
    );
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
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* A] General Information                                        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <fieldset className="onboarding-fieldset">
          <legend>Ерөнхий мэдээлэл</legend>

          {/* Аймаг / Хот */}
          <div className="form-group">
            <label htmlFor="kid-aimag">Аймаг / Хот *</label>
            <select
              id="kid-aimag"
              value={kid?.aimag ?? ""}
              onChange={(e) =>
                setKid({ aimag: e.target.value, sumDuureg: "", khorooBag: "" })
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
            <label htmlFor="kid-sum">Сум / Дүүрэг *</label>
            <select
              id="kid-sum"
              value={kid?.sumDuureg ?? ""}
              onChange={(e) =>
                setKid({ sumDuureg: e.target.value, khorooBag: "" })
              }
              disabled={!kid?.aimag}
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
            <label htmlFor="kid-khoroo">Хороо / Баг *</label>
            <select
              id="kid-khoroo"
              value={kid?.khorooBag ?? ""}
              onChange={(e) => setKid({ khorooBag: e.target.value })}
              disabled={!kid?.sumDuureg}
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
            <label htmlFor="kid-lastName">Овог *</label>
            <input
              id="kid-lastName"
              type="text"
              value={kid?.lastName ?? ""}
              onChange={(e) => setKid({ lastName: e.target.value })}
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
            <label htmlFor="kid-firstName">Нэр *</label>
            <input
              id="kid-firstName"
              type="text"
              value={kid?.firstName ?? ""}
              onChange={(e) => setKid({ firstName: e.target.value })}
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
            <label htmlFor="kid-birthYear">Төрсөн он *</label>
            <input
              id="kid-birthYear"
              type="number"
              min={1990}
              max={currentYear - 4}
              value={kid?.birthYear ?? ""}
              onChange={(e) =>
                setKid({
                  birthYear: e.target.value ? Number(e.target.value) : "",
                })
              }
              placeholder="Жнь: 2012"
              aria-required="true"
              aria-invalid={!!errors.birthYear}
            />
            {kid?.birthYear && (
              <span className="field-hint">
                Нас: {currentYear - Number(kid.birthYear)}
              </span>
            )}
            {errors.birthYear && (
              <span className="field-error">{errors.birthYear}</span>
            )}
          </div>

          {/* Утас */}
          <div className="form-group">
            <label htmlFor="kid-phone">Холбогдох утасны дугаар *</label>
            <input
              id="kid-phone"
              type="tel"
              value={kid?.phone ?? ""}
              onChange={(e) => setKid({ phone: e.target.value })}
              placeholder="Жнь: 88001122"
              aria-required="true"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <span className="field-error">{errors.phone}</span>
            )}
          </div>
        </fieldset>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* B] School and Grade                                           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <fieldset className="onboarding-fieldset">
          <legend>Сургууль, Анги</legend>

          {/* Сургууль */}
          <div className="form-group">
            <label htmlFor="kid-school">Ямар сургууль вэ? *</label>
            <select
              id="kid-school"
              value={kid?.school ?? ""}
              onChange={(e) => setKid({ school: e.target.value })}
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

          {/* Анги */}
          <div className="form-group">
            <label htmlFor="kid-grade">Хэддүгээр анги вэ? *</label>
            <select
              id="kid-grade"
              value={kid?.grade ?? ""}
              onChange={(e) =>
                setKid({ grade: e.target.value ? Number(e.target.value) : "" })
              }
              aria-required="true"
              aria-invalid={!!errors.grade}
            >
              <option value="">-- Сонгоно уу --</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}-р анги
                </option>
              ))}
            </select>
            {errors.grade && (
              <span className="field-error">{errors.grade}</span>
            )}
          </div>
        </fieldset>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* C] Yes/No Research Questions                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <fieldset className="onboarding-fieldset">
          <legend>Судалгааны асуулт</legend>

          <div className="form-group">
            <label>Танай сургууль зориулалтын спорт заалтай юу? *</label>
            <YesNo field="hasGym" value={kid?.hasGym ?? null} />
            {errors.hasGym && (
              <span className="field-error">{errors.hasGym}</span>
            )}
          </div>

          <div className="form-group">
            <label>Сагсан бөмбөгийн сургалт, хөтөлбөртэй юу? *</label>
            <YesNo
              field="hasBasketballProgram"
              value={kid?.hasBasketballProgram ?? null}
            />
            {errors.hasBasketballProgram && (
              <span className="field-error">{errors.hasBasketballProgram}</span>
            )}
          </div>

          <div className="form-group">
            <label>Сагсан бөмбөгийн бөмбөгтэй юу? *</label>
            <YesNo field="hasBalls" value={kid?.hasBalls ?? null} />
            {errors.hasBalls && (
              <span className="field-error">{errors.hasBalls}</span>
            )}
          </div>

          <div className="form-group">
            <label>Зориулалтын онооны цагтай юу? *</label>
            <YesNo field="hasScoreClock" value={kid?.hasScoreClock ?? null} />
            {errors.hasScoreClock && (
              <span className="field-error">{errors.hasScoreClock}</span>
            )}
          </div>

          <div className="form-group">
            <label>Сагсан бөмбөгийн багш, дасгалжуулагчтай юу? *</label>
            <YesNo field="hasCoach" value={kid?.hasCoach ?? null} />
            {errors.hasCoach && (
              <span className="field-error">{errors.hasCoach}</span>
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
