/**
 * onboardingStore.ts
 *
 * Zustand store for the global onboarding flow.
 * Persisted to sessionStorage so data survives page reloads but is
 * cleared when the browser tab is closed.
 *
 * Database document structure is designed for analytics:
 *   - Location hierarchy (aimag → sumDuureg → khorooBag) enables
 *     geographic aggregation of kids/coaches per region per year.
 *   - birthYear enables age-group analytics independent of current year.
 *   - Yes/No survey booleans enable infrastructure/resource stats per school/region.
 *   - school + grade enable per-school and per-grade breakdowns.
 *
 * Usage:
 *   import { useOnboardingStore } from '@/stores/onboardingStore';
 *   const { role, setRole, kid, setKid, clear } = useOnboardingStore();
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Shared location fields ───────────────────────────────────────────────
export type LocationInfo = {
  aimag: string; // аймаг/хот
  sumDuureg: string; // сум/дүүрэг
  khorooBag: string; // хороо/баг
};

// ── Shared general info ──────────────────────────────────────────────────
export type GeneralInfo = LocationInfo & {
  lastName: string; // Овог
  firstName: string; // Нэр
  birthYear: number | ""; // Төрсөн он (age = currentYear - birthYear)
  phone: string; // Холбогдох утасны дугаар
};

// ── Kid onboarding answer shape ──────────────────────────────────────────
export type KidOnboarding = GeneralInfo & {
  // B] School and grade
  school: string; // Ямар сургууль вэ?
  grade: number | ""; // Хэддүгээр анги вэ? (1-12)
  // C] Yes/No research questions
  hasGym: boolean | null; // Танай сургууль зориулалтын спорт заалтай юу?
  hasBasketballProgram: boolean | null; // Сагсан бөмбөгийн сургалт, хөтөлбөртэй юу?
  hasBalls: boolean | null; // Сагсан бөмбөгийн бөмбөгтэй юу?
  hasScoreClock: boolean | null; // Зориулалтын онооны цагтай юу?
  hasCoach: boolean | null; // Сагсан бөмбөгийн багш, дасгалжуулагчтай юу?
  seasonId?: string;
};

// ── Coach onboarding answer shape ────────────────────────────────────────
export type CoachOnboarding = GeneralInfo & {
  // B] School + Yes/No research questions
  school: string; // Ямар сургуульд багшилдаг вэ?
  hasGym: boolean | null; // Танай сургууль зориулалтын спорт заалтай юу?
  hasBasketballProgram: boolean | null; // Танай сургууль сагсан бөмбөгийн сургалтын хөтөлбөртэй юу?
  hasScoreClock: boolean | null; // Сагсан бөмбөгийн тэмцээний онооны цагтай юу?
  isProfessionalCoach: boolean | null; // Та мэргэжлийн сагсан бөмбөгийн дасгалжуулагч уу?
  seasonId?: string;
};

// ── Store interface ──────────────────────────────────────────────────────
export interface OnboardingState {
  /** Current step index: 0 = choose role, 1 = form, 2 = review */
  step: number;
  role?: "kid" | "coach";
  kid?: KidOnboarding;
  coach?: CoachOnboarding;

  setStep(step: number): void;
  setRole(role: "kid" | "coach"): void;
  setKid(data: Partial<KidOnboarding>): void;
  setCoach(data: Partial<CoachOnboarding>): void;
  /** Reset the entire onboarding state (call after successful submit) */
  clear(): void;
}

// ── Default values ───────────────────────────────────────────────────────
const defaultKid: KidOnboarding = {
  aimag: "",
  sumDuureg: "",
  khorooBag: "",
  lastName: "",
  firstName: "",
  birthYear: "",
  phone: "",
  school: "",
  grade: "",
  hasGym: null,
  hasBasketballProgram: null,
  hasBalls: null,
  hasScoreClock: null,
  hasCoach: null,
  seasonId: "",
};

const defaultCoach: CoachOnboarding = {
  aimag: "",
  sumDuureg: "",
  khorooBag: "",
  lastName: "",
  firstName: "",
  birthYear: "",
  phone: "",
  school: "",
  hasGym: null,
  hasBasketballProgram: null,
  hasScoreClock: null,
  isProfessionalCoach: null,
  seasonId: "",
};

// ── Store ────────────────────────────────────────────────────────────────
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: 0,
      role: undefined,
      kid: undefined,
      coach: undefined,

      setStep: (step) => set({ step }),

      setRole: (role) =>
        set({
          role,
          // Initialise the matching sub-object so the form has defaults
          kid: role === "kid" ? { ...defaultKid } : undefined,
          coach: role === "coach" ? { ...defaultCoach } : undefined,
          step: 1,
        }),

      setKid: (data) =>
        set((state) => ({
          kid: { ...(state.kid ?? defaultKid), ...data },
        })),

      setCoach: (data) =>
        set((state) => ({
          coach: { ...(state.coach ?? defaultCoach), ...data },
        })),

      clear: () =>
        set({
          step: 0,
          role: undefined,
          kid: undefined,
          coach: undefined,
        }),
    }),
    {
      name: "sain-onboarding", // sessionStorage key
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
