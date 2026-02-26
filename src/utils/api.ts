/**
 * api.ts — lightweight helpers for calling Cloud Function endpoints.
 *
 * Uses NEXT_PUBLIC_FUNCTIONS_URL env var with a localhost fallback
 * (same convention as AdminUploadCsv / AdminGameStatsInput).
 */

import { auth } from "@/lib/firebase";

// ── Base URL ─────────────────────────────────────────────────────────────
const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_URL ??
  "http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1";

// ── Helper: get a fresh ID token ─────────────────────────────────────────
async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken(/* forceRefresh */ true);
}

// ── POST /api/saveOnboarding ─────────────────────────────────────────────
export interface SaveOnboardingPayload {
  role: "kid" | "coach";
  answers: Record<string, unknown>;
}

export interface SaveOnboardingResult {
  success: boolean;
  docPath: string;
  docId: string;
}

/**
 * Submit onboarding answers to the backend Cloud Function.
 *
 * @param payload  `{ role, answers }` — the role and form answers
 * @returns        API response with `{ success, docPath, docId }`
 * @throws         On network error, auth error, or non-200 response
 */
export async function saveOnboarding(
  payload: SaveOnboardingPayload,
): Promise<SaveOnboardingResult> {
  const token = await getIdToken();

  const res = await fetch(`${FUNCTIONS_BASE_URL}/api/saveOnboarding`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error ?? `Server error (${res.status})`);
  }

  return data as SaveOnboardingResult;
}
