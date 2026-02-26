/**
 * onboardingApi.ts
 *
 * Express application exported as a single Cloud Function (`api`).
 * Implements the global onboarding backend for two user types: kid & coach.
 *
 * Endpoints:
 *   POST /saveOnboarding          — save onboarding answers (any authenticated user)
 *   GET  /admin/onboarding/list   — paginated list of onboarding docs (admin only)
 *   GET  /admin/onboarding/export — CSV export of onboarding docs (admin only)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Firestore rules snippet (add to firestore.rules):
 *
 *   match /onboarding/kids/{uid} {
 *     allow read: if request.auth != null && request.auth.token.admin == true;
 *     allow write: if request.auth != null && request.auth.uid == uid;
 *   }
 *   match /onboarding/coaches/{uid} {
 *     allow read: if request.auth != null && request.auth.token.admin == true;
 *     allow write: if request.auth != null && request.auth.uid == uid;
 *   }
 * ──────────────────────────────────────────────────────────────────────────────
 */

import express, { Request, Response, NextFunction } from "express";
import { admin, db, FieldValue } from "./adminSetup.js";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type OnboardingRole = "kid" | "coach";

// Kid answer fields:   name, school, grade, whyPlay (all required strings), phone (optional)
// Coach answer fields: name, school, hasGym (bool), hasBalls (bool),
//                      hasScoreboard (bool, optional), programAvailable (string, optional), notes (optional)

/** Decoded user attached to request by auth middleware */
interface DecodedUser {
  uid: string;
  email?: string;
  isAdmin: boolean;
}

// Extend Express Request to carry our authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: DecodedUser;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract and verify the Firebase ID token from the Authorization header.
 * Returns a DecodedUser object with uid, email, and isAdmin flag.
 */
async function verifyToken(req: Request): Promise<DecodedUser> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err = new Error(
      "Unauthorized – missing or malformed Authorization header",
    );
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) {
    const err = new Error("Unauthorized – token is empty");
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (verifyErr: unknown) {
    const message =
      verifyErr instanceof Error
        ? verifyErr.message
        : "unknown verification error";
    const err = new Error(`Unauthorized – invalid token: ${message}`);
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }

  // Check admin via custom claim first, then Firestore fallback
  let isAdmin = decoded.admin === true;
  if (!isAdmin && decoded.uid) {
    try {
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        isAdmin = userDoc.data()?.role === "admin";
      }
    } catch {
      // Firestore fallback failed – not admin
    }
  }

  return { uid: decoded.uid, email: decoded.email, isAdmin };
}

/**
 * Return a Firestore CollectionReference for onboarding/{kids|coaches}.
 * Firestore structure:  onboarding (collection) -> kids (doc) -> {uid} docs
 * We model this as:     onboarding/kids/{uid}   (subcollection of the "kids" doc)
 */
function onboardingCollection(role: OnboardingRole) {
  const sub = role === "kid" ? "kids" : "coaches";
  return db.collection("onboarding").doc(sub).collection("entries");
  // ↑ Using "entries" subcollection under onboarding/kids or onboarding/coaches.
  //   If you prefer flat paths like onboarding/kids/{uid}, replace with:
  //     return db.collection(`onboarding_${sub}`);
  //   and update Firestore rules accordingly.
}

// ═══════════════════════════════════════════════════════════════════════════
// Middleware
// ═══════════════════════════════════════════════════════════════════════════

/** Middleware: require any authenticated user and attach to req.user */
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    req.user = await verifyToken(req);
    next();
  } catch (err: unknown) {
    const statusCode =
      (err as Error & { statusCode?: number }).statusCode || 401;
    res.status(statusCode).json({ error: (err as Error).message });
  }
}

/** Middleware: require admin user (must be placed AFTER requireAuth) */
function requireAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Forbidden – admin privileges required" });
    return;
  }
  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation helpers
// ═══════════════════════════════════════════════════════════════════════════

function validateKidAnswers(answers: Record<string, unknown>): string | null {
  const required = ["name", "school", "grade", "whyPlay"] as const;
  for (const field of required) {
    if (
      !answers[field] ||
      typeof answers[field] !== "string" ||
      !(answers[field] as string).trim()
    ) {
      return `Missing or empty required field: ${field}`;
    }
  }
  return null;
}

function validateCoachAnswers(answers: Record<string, unknown>): string | null {
  // Required string fields
  for (const field of ["name", "school"] as const) {
    if (
      !answers[field] ||
      typeof answers[field] !== "string" ||
      !(answers[field] as string).trim()
    ) {
      return `Missing or empty required field: ${field}`;
    }
  }
  // Required boolean fields
  for (const field of ["hasGym", "hasBalls"] as const) {
    if (typeof answers[field] !== "boolean") {
      return `Missing or invalid required field (must be boolean): ${field}`;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSV helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Escape a value for CSV (wrap in quotes if it contains comma, quote, or newline) */
function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from an array of objects and a list of column keys */
function buildCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(csvEscape).join(",");
  const body = rows.map((row) =>
    columns.map((col) => csvEscape(row[col])).join(","),
  );
  return [header, ...body].join("\r\n") + "\r\n";
}

// ═══════════════════════════════════════════════════════════════════════════
// Express app
// ═══════════════════════════════════════════════════════════════════════════

export const app = express();

// Parse JSON bodies (Cloud Functions already does this, but belt-and-suspenders)
app.use(express.json());

// ── POST /saveOnboarding ─────────────────────────────────────────────────
app.post(
  "/saveOnboarding",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { role, answers } = req.body as {
        role?: string;
        answers?: Record<string, unknown>;
      };

      // Validate role
      if (role !== "kid" && role !== "coach") {
        res
          .status(400)
          .json({
            error: 'Invalid or missing role. Must be "kid" or "coach".',
          });
        return;
      }

      // Validate answers object
      if (!answers || typeof answers !== "object") {
        res.status(400).json({ error: "Missing answers object." });
        return;
      }

      // Validate required fields per role
      const validationError =
        role === "kid"
          ? validateKidAnswers(answers)
          : validateCoachAnswers(answers);

      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const uid = req.user!.uid;
      const now = FieldValue.serverTimestamp();

      // ── Upsert users/{uid} inside a transaction to avoid race conditions ──
      const userRef = db.collection("users").doc(uid);
      await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (userSnap.exists) {
          // Only set role if not already set or if the user is not an admin
          const existing = userSnap.data();
          if (!existing?.role || existing.role === role) {
            tx.update(userRef, { role, updatedAt: now });
          }
          // If existing.role is different and not the same, we still allow
          // saving onboarding but don't overwrite role (admin may have changed it).
        } else {
          tx.set(userRef, {
            uid,
            email: req.user!.email || null,
            displayName: (answers.name as string) || null,
            photoURL: null,
            role,
            createdAt: now,
          });
        }
      });

      // ── Write onboarding doc ──────────────────────────────────────────────
      const col = onboardingCollection(role as OnboardingRole);
      const docRef = col.doc(uid);
      const docSnap = await docRef.get();

      const onboardingData: Record<string, unknown> = {
        uid,
        ...answers,
        updatedAt: now,
      };

      if (!docSnap.exists) {
        onboardingData.createdAt = now;
      }

      await docRef.set(onboardingData, { merge: true });

      const docPath = `onboarding/${role === "kid" ? "kids" : "coaches"}/entries/${uid}`;
      res.status(200).json({
        success: true,
        docPath,
        docId: uid,
      });
    } catch (err: unknown) {
      console.error("[saveOnboarding] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET /admin/onboarding/list ───────────────────────────────────────────
app.get(
  "/admin/onboarding/list",
  requireAuth,
  requireAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string | undefined;
      if (role !== "kid" && role !== "coach") {
        res
          .status(400)
          .json({ error: 'Query param "role" must be "kid" or "coach".' });
        return;
      }

      const pageSize = Math.min(
        Math.max(parseInt(req.query.pageSize as string, 10) || 25, 1),
        100,
      );
      const pageToken = (req.query.pageToken as string) || null;
      const q = ((req.query.q as string) || "").trim().toLowerCase();

      const col = onboardingCollection(role as OnboardingRole);

      // Build query — ordered by createdAt descending for consistent pagination
      let query = col.orderBy("createdAt", "desc");

      // If pageToken is provided, use it as a startAfter cursor (doc ID)
      if (pageToken) {
        const cursorDoc = await col.doc(pageToken).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      // Fetch one extra to know if there's a next page
      const snapshot = await query.limit(pageSize + 1).get();

      let docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Server-side filtering by name or school (case-insensitive substring)
      if (q) {
        docs = docs.filter((doc) => {
          const name = (
            ((doc as Record<string, unknown>).name as string) || ""
          ).toLowerCase();
          const school = (
            ((doc as Record<string, unknown>).school as string) || ""
          ).toLowerCase();
          return name.includes(q) || school.includes(q);
        });
      }

      const hasMore = docs.length > pageSize;
      if (hasMore) {
        docs = docs.slice(0, pageSize);
      }

      const nextPageToken =
        hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

      res.status(200).json({
        success: true,
        role,
        pageSize,
        count: docs.length,
        nextPageToken,
        data: docs,
      });
    } catch (err: unknown) {
      console.error("[admin/onboarding/list] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET /admin/onboarding/export ─────────────────────────────────────────
app.get(
  "/admin/onboarding/export",
  requireAuth,
  requireAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string | undefined;
      if (role !== "kid" && role !== "coach") {
        res
          .status(400)
          .json({ error: 'Query param "role" must be "kid" or "coach".' });
        return;
      }

      const q = ((req.query.q as string) || "").trim().toLowerCase();

      const col = onboardingCollection(role as OnboardingRole);
      const snapshot = await col.orderBy("createdAt", "desc").get();

      let rows: Record<string, unknown>[] = snapshot.docs.map((d) => {
        const data = d.data();
        // Convert Firestore timestamps to ISO strings for CSV readability
        const createdAt = data.createdAt?.toDate?.()
          ? data.createdAt.toDate().toISOString()
          : (data.createdAt ?? "");
        const updatedAt = data.updatedAt?.toDate?.()
          ? data.updatedAt.toDate().toISOString()
          : (data.updatedAt ?? "");
        return { ...data, createdAt, updatedAt } as Record<string, unknown>;
      });

      // Optional name/school filter
      if (q) {
        rows = rows.filter((row: Record<string, unknown>) => {
          const name = ((row.name as string) || "").toLowerCase();
          const school = ((row.school as string) || "").toLowerCase();
          return name.includes(q) || school.includes(q);
        });
      }

      // Define CSV columns per role
      const columns: string[] =
        role === "kid"
          ? [
              "uid",
              "name",
              "school",
              "grade",
              "whyPlay",
              "phone",
              "createdAt",
              "updatedAt",
            ]
          : [
              "uid",
              "name",
              "school",
              "hasGym",
              "hasBalls",
              "hasScoreboard",
              "programAvailable",
              "notes",
              "createdAt",
              "updatedAt",
            ];

      const csv = buildCsv(rows, columns);

      const filename = `onboarding_${role === "kid" ? "kids" : "coaches"}_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      // Add BOM for proper UTF-8 handling in Excel (important for Mongolian text)
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.status(200).send("\uFEFF" + csv);
    } catch (err: unknown) {
      console.error("[admin/onboarding/export] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// NOTE: This Express app is exported from this module and wired up in
// index.ts as:
//
//   import { app as onboardingApp } from "./onboardingApi.js";
//   export const api = onRequest({ cors: true }, onboardingApp);
//
// All endpoints above will then be accessible at:
//   https://<region>-<project>.cloudfunctions.net/api/saveOnboarding
//   https://<region>-<project>.cloudfunctions.net/api/admin/onboarding/list
//   https://<region>-<project>.cloudfunctions.net/api/admin/onboarding/export
//
// For local emulator testing:
//   http://localhost:5001/<project>/<region>/api/saveOnboarding
// ═══════════════════════════════════════════════════════════════════════════
