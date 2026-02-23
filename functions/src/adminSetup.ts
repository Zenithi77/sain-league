/**
 * adminSetup.ts
 *
 * Initializes the Firebase Admin SDK (singleton) and exports:
 *   - `admin`       – the admin namespace
 *   - `db`          – Firestore instance
 *   - `FieldValue`  – shortcut to admin.firestore.FieldValue
 *   - `requireAdmin(req)` – authentication guard that verifies a Bearer
 *                            token AND the custom claim `admin: true`.
 *
 * Usage in other modules:
 *   import { db, FieldValue, requireAdmin } from "./adminSetup.js";
 */

import * as admin from "firebase-admin";
import { Request } from "firebase-functions/v2/https";

// Initialize the Admin SDK exactly once.  The default credential is picked
// up automatically from the service‑account JSON (local) or from the
// metadata server (Cloud Functions runtime).
if (!admin.apps.length) {
  admin.initializeApp();
}

/** Firestore database handle */
export const db = admin.firestore();

/** Shortcut – avoids importing admin everywhere just for FieldValue */
export const FieldValue = admin.firestore.FieldValue;

// ---------------------------------------------------------------------------
// Authentication helper
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  admin: boolean;
}

/**
 * Verifies the incoming request has a valid Firebase ID‑token with the
 * `admin: true` custom claim.
 *
 * Extracts the token from the `Authorization: Bearer <token>` header.
 *
 * @param req - Incoming HTTP request (firebase-functions v2 Request)
 * @returns   The decoded user record (uid, email, admin flag)
 * @throws    An Error with an appropriate HTTP‑friendly message if
 *            authentication or authorisation fails.
 *
 * Example usage inside an onRequest handler:
 * ```ts
 * const user = await requireAdmin(req);
 * // user.uid, user.email available here
 * ```
 */
export async function requireAdmin(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized – missing or malformed Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) {
    throw new Error("Unauthorized – token is empty");
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "unknown verification error";
    throw new Error(`Unauthorized – invalid token: ${message}`);
  }

  // Check admin via custom claim first
  let isAdmin = decoded.admin === true;

  // Fallback: check Firestore users collection for role === 'admin'
  if (!isAdmin && decoded.uid) {
    try {
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        isAdmin = data?.role === "admin";
      }
    } catch (fsErr) {
      console.error("Firestore admin check failed:", fsErr);
    }
  }

  if (!isAdmin) {
    throw new Error("Forbidden – user does not have admin privileges");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    admin: true,
  };
}

// Re-export admin namespace for advanced callers
export { admin };
