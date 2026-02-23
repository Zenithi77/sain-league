/**
 * firestoreHelpers.ts
 *
 * Small Firestore utility wrappers used by Cloud Functions to keep
 * business‑logic code clean:
 *
 *   - `increment(docRef, field, amount)` – atomic FieldValue.increment
 *   - `setWithMerge(docRef, data)`       – set() with { merge: true }
 *   - `batchIncrement(batch, docRef, fields)` – add multiple increments
 *   - `safePushRecentResults(teamAggRef, result)` – transactional
 *       read‑modify‑write that keeps the recentResults array trimmed
 *       to MAX_RECENT_RESULTS entries.
 */

import {
  DocumentReference,
  WriteBatch,
  Transaction,
} from "firebase-admin/firestore";
import { db, FieldValue } from "./adminSetup.js";
import { MAX_RECENT_RESULTS } from "./constants.js";

// ---------------------------------------------------------------------------
// Simple atomic helpers
// ---------------------------------------------------------------------------

/**
 * Atomically increment a single numeric field on a document.
 *
 * @param docRef - Firestore document reference
 * @param field  - field path to increment
 * @param amount - value to add (can be negative for decrement)
 * @returns Promise that resolves when the update completes
 */
export async function increment(
  docRef: DocumentReference,
  field: string,
  amount: number,
): Promise<void> {
  await docRef.update({ [field]: FieldValue.increment(amount) });
}

/**
 * Set (or create) a document with merge semantics so existing fields that
 * are not in `data` are preserved.
 *
 * @param docRef - Firestore document reference
 * @param data - Data to merge into the document
 * @returns Promise that resolves when the set completes
 */
export async function setWithMerge(
  docRef: DocumentReference,
  data: Record<string, unknown>,
): Promise<void> {
  await docRef.set(data, { merge: true });
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

/**
 * Add multiple field increments to an existing WriteBatch.
 *
 * @param batch  - Firestore WriteBatch
 * @param docRef - document to update
 * @param fields - map of { fieldName: incrementAmount }
 * @returns void
 */
export function batchIncrement(
  batch: WriteBatch,
  docRef: DocumentReference,
  fields: Record<string, number>,
): void {
  const updates: Record<string, FirebaseFirestore.FieldValue> = {};
  for (const [field, amount] of Object.entries(fields)) {
    updates[field] = FieldValue.increment(amount);
  }
  batch.update(docRef, updates);
}

/**
 * Add a merge‑set operation to an existing WriteBatch.
 *
 * @param batch - Firestore WriteBatch
 * @param docRef - document to set
 * @param data - Data to merge into the document
 * @returns void
 */
export function batchSetMerge(
  batch: WriteBatch,
  docRef: DocumentReference,
  data: Record<string, unknown>,
): void {
  batch.set(docRef, data, { merge: true });
}

// ---------------------------------------------------------------------------
// Transactional array helpers
// ---------------------------------------------------------------------------

/** A single game result entry stored in teamAggregates.recentResults */
export interface GameResult {
  gameId: string;
  opponentId: string;
  /** "W" | "L" | "D" (draw, if applicable) */
  result: string;
  /** Own team score */
  score: number;
  /** Opponent score */
  opponentScore: number;
  /** ISO-8601 date string */
  date: string;
}

/**
 * Safely push a new game result onto a team‑aggregate's `recentResults`
 * array, trimming it to at most `MAX_RECENT_RESULTS` entries (latest first).
 *
 * Uses a Firestore **transaction** so concurrent writes don't corrupt the
 * array.  The newest result is always at index 0.
 *
 * @param teamAggRef - DocumentReference to
 *                     `seasons/{sid}/teamAggregates/{teamId}`
 * @param result     - the new GameResult to prepend
 * @returns Promise that resolves when the transaction completes
 */
export async function safePushRecentResults(
  teamAggRef: DocumentReference,
  result: GameResult,
): Promise<void> {
  await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(teamAggRef);
    const data = snap.data() ?? {};
    const current: GameResult[] = Array.isArray(data.recentResults)
      ? data.recentResults
      : [];

    // Prepend the new result, then trim to max length
    const updated = [result, ...current].slice(0, MAX_RECENT_RESULTS);

    tx.set(teamAggRef, { recentResults: updated }, { merge: true });
  });
}

/**
 * Replace or insert a game result in the recentResults array (matched by
 * gameId) inside a transaction.  Useful when re‑uploading / correcting a
 * box score for a game that was already recorded.
 *
 * @param teamAggRef - DocumentReference to team aggregate doc
 * @param result     - updated GameResult
 * @returns Promise that resolves when the transaction completes
 */
export async function safeUpsertRecentResult(
  teamAggRef: DocumentReference,
  result: GameResult,
): Promise<void> {
  await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(teamAggRef);
    const data = snap.data() ?? {};
    let current: GameResult[] = Array.isArray(data.recentResults)
      ? data.recentResults
      : [];

    // Remove existing entry for this gameId (if any)
    current = current.filter((r) => r.gameId !== result.gameId);

    // Prepend updated result and trim
    const updated = [result, ...current].slice(0, MAX_RECENT_RESULTS);

    tx.set(teamAggRef, { recentResults: updated }, { merge: true });
  });
}

// ---------------------------------------------------------------------------
// Convenience: create a new Firestore batch
// ---------------------------------------------------------------------------

/**
 * Returns a fresh WriteBatch.  Firestore batches support up to 500
 * operations; callers are responsible for committing.
 *
 * @returns A new Firestore WriteBatch
 */
export function createBatch(): WriteBatch {
  return db.batch();
}
