/**
 * onboardingStore.ts
 *
 * Zustand store for the global onboarding flow.
 * Persisted to sessionStorage so data survives page reloads but is
 * cleared when the browser tab is closed.
 *
 * Usage:
 *   import { useOnboardingStore } from '@/stores/onboardingStore';
 *   const { role, setRole, kid, setKid, clear } = useOnboardingStore();
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Kid onboarding answer shape ──────────────────────────────────────────
export type KidOnboarding = {
  name: string;
  school: string;
  grade: string;
  whyPlay: string;
  phone?: string;
  seasonId?: string;
};

// ── Coach onboarding answer shape ────────────────────────────────────────
export type CoachOnboarding = {
  name: string;
  school: string;
  hasGym: boolean;
  hasBalls: boolean;
  hasScoreboard: boolean;
  programAvailable?: string;
  scorePointerClock?: boolean;
  notes?: string;
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
  name: "",
  school: "",
  grade: "",
  whyPlay: "",
  phone: "",
  seasonId: "",
};

const defaultCoach: CoachOnboarding = {
  name: "",
  school: "",
  hasGym: false,
  hasBalls: false,
  hasScoreboard: false,
  programAvailable: "",
  scorePointerClock: false,
  notes: "",
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
