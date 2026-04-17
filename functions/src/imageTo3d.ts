/**
 * imageTo3d.ts
 *
 * Meshy Image-to-3D avatar pipeline handlers:
 *
 *   handleCreateAvatarTask       – accepts client request, creates a Meshy
 *                                   Image-to-3D task, stores it in Firestore.
 *
 *   handleMeshyWebhook           – receives webhook callbacks from Meshy,
 *                                   updates Firestore idempotently.
 *
 *   handleFallbackRetrieve       – polls stale tasks that haven't received
 *                                   a webhook update within 5 minutes.
 */

import { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import * as admin from "firebase-admin";
import { db, FieldValue, requireAdmin } from "./adminSetup.js";
import type { AvatarTaskStatus } from "./constants.js";

// ---------------------------------------------------------------------------
// Secrets / config
// ---------------------------------------------------------------------------

function getMeshyApiKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new Error("MESHY_API_KEY secret is not configured");
  }
  return key;
}

const WEBHOOK_BASE_URL = "https://us-central1-sain-league.cloudfunctions.net";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MESHY_IMAGE_TO_3D_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";

/** How long to wait for a webhook before falling back to polling (ms). */
const FALLBACK_WINDOW_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Terminal statuses after which no further updates are expected. */
const TERMINAL_STATUSES: ReadonlySet<AvatarTaskStatus> = new Set([
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
]);

function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status as AvatarTaskStatus);
}

/**
 * Downloads a GLB model from Meshy CDN and uploads it to Firebase Storage.
 * Returns the public download URL from Firebase Storage, or null on failure.
 */
async function persistGlbToStorage(
  meshyGlbUrl: string,
  playerId: string,
  meshyTaskId: string,
): Promise<string | null> {
  try {
    const response = await fetch(meshyGlbUrl);
    if (!response.ok) {
      console.error(
        `[persistGlb] Failed to download GLB: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const bucket = admin.storage().bucket();
    const filePath = `avatars/models/${playerId}_${meshyTaskId}.glb`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: "model/gltf-binary",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Make publicly readable
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    console.log(`[persistGlb] Uploaded GLB to ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error("[persistGlb] Error persisting GLB to Storage:", err);
    return null;
  }
}

/**
 * Merge a Meshy task object (from webhook or GET) into Firestore fields.
 * Returns only the fields that should be written.
 */
function buildFirestoreUpdate(
  task: MeshyTaskObject,
  source: "webhook" | "poll",
): Record<string, unknown> {
  const now = FieldValue.serverTimestamp();
  const update: Record<string, unknown> = {
    status: task.status,
    progress: task.progress ?? null,
    modelUrls: task.model_urls ?? null,
    textureUrls: task.texture_urls ?? null,
    thumbnailUrl: task.thumbnail_url ?? null,
    taskError: task.task_error ?? null,
    meshyStartedAt: task.started_at ?? null,
    meshyCreatedAt: task.created_at ?? null,
    meshyFinishedAt: task.finished_at ?? null,
    meshyExpiresAt: task.expires_at ?? null,
    texturePrompt: task.texture_prompt ?? null,
    textureImageUrl: task.texture_image_url ?? null,
    updatedAt: now,
  };

  if (source === "webhook") {
    update.webhookReceivedAt = now;
    update.lastWebhookAt = now;
  } else {
    update.lastPollAt = now;
  }

  if (isTerminalStatus(task.status)) {
    // No more fallback polling needed
    update.fallbackPollDueAt = null;
  }

  return update;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Meshy task object shape (subset we care about). */
interface MeshyTaskObject {
  id: string;
  status: string;
  progress?: number;
  started_at?: number | null;
  created_at?: number | null;
  finished_at?: number | null;
  expires_at?: number | null;
  model_urls?: Record<string, string> | null;
  texture_urls?: Array<Record<string, string>> | null;
  thumbnail_url?: string | null;
  texture_prompt?: string | null;
  texture_image_url?: string | null;
  task_error?: { message?: string } | null;
}

interface CreateAvatarRequestBody {
  playerId: string;
  imageUrl: string;
  heightCm?: number;
  weightKg?: number;
  jerseyNumber?: number | string;
  teamColor?: string;
}

function isValidCreateBody(body: unknown): body is CreateAvatarRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.playerId !== "string" || !b.playerId) return false;
  if (typeof b.imageUrl !== "string" || !b.imageUrl) return false;
  return true;
}

function isValidMeshyTask(body: unknown): body is MeshyTaskObject {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.id === "string" && typeof b.status === "string";
}

// ---------------------------------------------------------------------------
// 1. createAvatarTask — HTTP endpoint
// ---------------------------------------------------------------------------

/**
 * POST handler that:
 * 1. Authenticates the caller (admin only).
 * 2. Validates the request body.
 * 3. Creates a Firestore doc with status = queued.
 * 4. Calls Meshy POST /openapi/v1/image-to-3d.
 * 5. Saves the returned task id and sets fallback poll deadline.
 * 6. Returns task id and Firestore doc id.
 */
export async function handleCreateAvatarTask(
  req: Request,
  res: Response,
): Promise<void> {
  // --- Auth -----------------------------------------------------------------
  let user: { uid: string };
  try {
    user = await requireAdmin(req);
  } catch (err: unknown) {
    res.status(401).json({ error: (err as Error).message });
    return;
  }

  // --- Method check ---------------------------------------------------------
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // --- Validate body --------------------------------------------------------
  const body = req.body as unknown;
  if (!isValidCreateBody(body)) {
    res.status(400).json({
      error:
        "Invalid request body. Required: { playerId: string, imageUrl: string }",
    });
    return;
  }

  const { playerId, imageUrl, heightCm, weightKg, jerseyNumber, teamColor } =
    body;

  // --- Create Firestore doc (status = queued) --------------------------------
  const docRef = db.collection("avatarTasks").doc();
  const now = FieldValue.serverTimestamp();
  const fallbackPollDueAt = new Date(Date.now() + FALLBACK_WINDOW_MS);

  const avatarDoc: Record<string, unknown> = {
    playerId,
    imageUrl,
    textureImageUrl: imageUrl,
    heightCm: heightCm ?? null,
    weightKg: weightKg ?? null,
    jerseyNumber: jerseyNumber ?? null,
    teamColor: teamColor ?? null,
    // Meshy generation defaults
    modelType: "standard",
    aiModel: "latest",
    topology: "quad",
    targetPolycount: 50000,
    symmetryMode: "auto",
    shouldRemesh: true,
    shouldTexture: true,
    enablePbr: true,
    moderation: false,
    imageEnhancement: true,
    removeLighting: true,
    targetFormats: ["glb"],
    autoSize: false,
    originAt: "bottom",
    // Tracking fields
    meshyTaskId: null,
    status: "queued",
    progress: null,
    modelUrls: null,
    textureUrls: null,
    thumbnailUrl: null,
    taskError: null,
    userId: user.uid,
    createdAt: now,
    updatedAt: now,
    webhookReceivedAt: null,
    lastPollAt: null,
    lastWebhookAt: null,
    fallbackPollDueAt,
    fallbackPollCount: 0,
    retryCount: 0,
  };

  await docRef.set(avatarDoc);

  // --- Build Meshy request body ---------------------------------------------
  const webhookUrl = `${WEBHOOK_BASE_URL}/meshyWebhook`;

  const meshyPayload = {
    image_url: imageUrl,
    texture_image_url: imageUrl,
    model_type: "standard",
    ai_model: "latest",
    topology: "quad",
    target_polycount: 50000,
    symmetry_mode: "auto",
    should_remesh: true,
    save_pre_remeshed_model: false,
    should_texture: true,
    enable_pbr: true,
    moderation: false,
    image_enhancement: true,
    remove_lighting: true,
    target_formats: ["glb"],
    auto_size: false,
    origin_at: "bottom",
    callback_url: webhookUrl,
  };

  // --- Call Meshy API -------------------------------------------------------
  let apiResponse: globalThis.Response;
  try {
    apiResponse = await fetch(MESHY_IMAGE_TO_3D_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getMeshyApiKey()}`,
      },
      body: JSON.stringify(meshyPayload),
    });
  } catch (err: unknown) {
    console.error("[createAvatarTask] Network error:", err);
    await docRef.update({
      status: "error",
      taskError: "Network error calling Meshy API",
      updatedAt: now,
    });
    res.status(502).json({ error: "Failed to reach Meshy API" });
    return;
  }

  const apiData = (await apiResponse.json()) as Record<string, unknown>;

  if (!apiResponse.ok) {
    console.error("[createAvatarTask] Meshy API error:", apiData);
    await docRef.update({
      status: "error",
      taskError: JSON.stringify(apiData),
      updatedAt: now,
    });
    res.status(apiResponse.status).json({
      error: "Meshy API error",
      details: apiData,
    });
    return;
  }

  // --- Save Meshy task id ---------------------------------------------------
  const meshyTaskId = (apiData.result as string) ?? (apiData.id as string);
  if (!meshyTaskId) {
    console.error("[createAvatarTask] No task id in Meshy response:", apiData);
    await docRef.update({
      status: "error",
      taskError: "Missing task ID in Meshy response",
      updatedAt: now,
    });
    res.status(502).json({ error: "Missing task ID in Meshy response" });
    return;
  }

  await docRef.update({
    meshyTaskId,
    status: "pending",
    updatedAt: now,
  });

  console.log(
    `[createAvatarTask] Task ${meshyTaskId} created (doc ${docRef.id}) for player ${playerId} by user ${user.uid}`,
  );

  res.status(200).json({
    docId: docRef.id,
    meshyTaskId,
    status: "pending",
  });
}

// ---------------------------------------------------------------------------
// 2. meshyWebhookController — HTTP endpoint
// ---------------------------------------------------------------------------

/**
 * POST handler that:
 * 1. Accepts the full Meshy task object as the webhook payload.
 * 2. Matches the task id to a Firestore document.
 * 3. Updates Firestore idempotently (webhook data wins unless older).
 * 4. Returns 200 immediately after validation and storage.
 */
export async function handleMeshyWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as unknown;
  if (!isValidMeshyTask(body)) {
    console.warn("[meshyWebhook] Invalid payload:", body);
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const meshyTaskId = body.id;

  // --- Find matching Firestore doc ------------------------------------------
  const snap = await db
    .collection("avatarTasks")
    .where("meshyTaskId", "==", meshyTaskId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.warn(
      `[meshyWebhook] No Firestore doc for meshyTaskId=${meshyTaskId}`,
    );
    res.status(200).json({ received: true, unknown: true });
    return;
  }

  const docRef = snap.docs[0].ref;
  const existing = snap.docs[0].data();

  // --- Idempotency: don't regress from a terminal state ---------------------
  if (existing.status && isTerminalStatus(existing.status as string)) {
    console.log(
      `[meshyWebhook] Task ${meshyTaskId} already terminal (${existing.status}), ignoring`,
    );
    res.status(200).json({ received: true, unchanged: true });
    return;
  }

  // --- Merge webhook snapshot into Firestore --------------------------------
  const update = buildFirestoreUpdate(body, "webhook");

  // --- Persist GLB to Firebase Storage when SUCCEEDED -----------------------
  if (body.status === "SUCCEEDED" && body.model_urls && body.model_urls.glb) {
    const playerId = existing.playerId as string;
    const storageUrl = await persistGlbToStorage(
      body.model_urls.glb,
      playerId,
      meshyTaskId,
    );
    if (storageUrl) {
      // Override modelUrls.glb with the permanent Storage URL
      const modelUrls = { ...(body.model_urls ?? {}), glb: storageUrl };
      update.modelUrls = modelUrls;
      update.storageGlbUrl = storageUrl;
    }
  }

  await docRef.update(update);

  console.log(
    `[meshyWebhook] Task ${meshyTaskId} updated → status=${body.status}, progress=${body.progress ?? "n/a"}`,
  );

  res.status(200).json({ received: true, updated: true });
}

// ---------------------------------------------------------------------------
// 3. fallbackRetrieveController — callable / scheduled
// ---------------------------------------------------------------------------

/**
 * Finds tasks that haven't received a webhook update for >= 5 minutes
 * and are not yet terminal. Polls Meshy GET endpoint for each.
 */
export async function handleFallbackRetrieve(
  req: Request,
  res: Response,
): Promise<void> {
  // --- Auth -----------------------------------------------------------------
  try {
    await requireAdmin(req);
  } catch (err: unknown) {
    res.status(401).json({ error: (err as Error).message });
    return;
  }

  const now = new Date();

  // Find non-terminal tasks whose fallback poll is due
  const snap = await db
    .collection("avatarTasks")
    .where("fallbackPollDueAt", "<=", now)
    .where("status", "not-in", ["SUCCEEDED", "FAILED", "EXPIRED", "queued"])
    .limit(50)
    .get();

  if (snap.empty) {
    res.status(200).json({ ok: true, polled: 0 });
    return;
  }

  const results: Array<{ meshyTaskId: string; newStatus: string }> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const meshyTaskId = data.meshyTaskId as string;
    if (!meshyTaskId) continue;

    try {
      const pollResp = await fetch(`${MESHY_IMAGE_TO_3D_URL}/${meshyTaskId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getMeshyApiKey()}`,
        },
      });

      if (!pollResp.ok) {
        console.error(
          `[fallbackRetrieve] Meshy GET error for ${meshyTaskId}: ${pollResp.status}`,
        );
        continue;
      }

      const task = (await pollResp.json()) as unknown;
      if (!isValidMeshyTask(task)) {
        console.error(
          `[fallbackRetrieve] Invalid task object for ${meshyTaskId}`,
        );
        continue;
      }

      // Only update if the polled data is newer/different
      if (data.status === task.status && isTerminalStatus(task.status)) {
        continue;
      }

      const update = buildFirestoreUpdate(task, "poll");
      update.fallbackPollCount = FieldValue.increment(1);

      // Set next fallback poll unless terminal
      if (!isTerminalStatus(task.status)) {
        update.fallbackPollDueAt = new Date(Date.now() + FALLBACK_WINDOW_MS);
      }

      // --- Persist GLB to Firebase Storage when SUCCEEDED -------------------
      if (
        task.status === "SUCCEEDED" &&
        task.model_urls &&
        task.model_urls.glb
      ) {
        const playerId = data.playerId as string;
        const storageUrl = await persistGlbToStorage(
          task.model_urls.glb,
          playerId,
          meshyTaskId,
        );
        if (storageUrl) {
          const modelUrls = { ...(task.model_urls ?? {}), glb: storageUrl };
          update.modelUrls = modelUrls;
          update.storageGlbUrl = storageUrl;
        }
      }

      await doc.ref.update(update);
      results.push({ meshyTaskId, newStatus: task.status });

      console.log(
        `[fallbackRetrieve] Polled ${meshyTaskId} → status=${task.status}`,
      );
    } catch (err: unknown) {
      console.error(`[fallbackRetrieve] Error polling ${meshyTaskId}:`, err);
    }
  }

  res.status(200).json({ ok: true, polled: results.length, results });
}
