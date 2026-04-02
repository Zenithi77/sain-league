"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Persists a plain-object form state to localStorage and handles the
 * browser `beforeunload` warning for unsaved changes.
 *
 * @param key       Unique localStorage key (e.g. "player-add", "player-edit-abc123")
 * @param state     Current form values (must be JSON-serialisable)
 * @param setState  Setter to restore persisted values on mount
 * @param isDirty   Whether the form has unsaved changes
 * @param enabled   Set false to disable (e.g. while loading server data)
 */
export function useFormPersist<T extends Record<string, unknown>>(
  key: string,
  state: T,
  setState: (saved: Partial<T>) => void,
  isDirty: boolean,
  enabled = true,
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Restore on mount ──
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<T>;
        setState(saved);
      }
    } catch {
      // ignore corrupt data
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // ── Persist on every state change (debounced via requestIdleCallback / 500ms) ──
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(stateRef.current));
      } catch {
        // storage full or unavailable
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [key, state, enabled]);

  // ── beforeunload warning ──
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Clear persisted data (call on successful save) ──
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return { clearDraft };
}
