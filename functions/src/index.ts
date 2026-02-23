/**
 * Cloud Functions entry-point for the Sain Girls League backend.
 *
 * Exports:
 *   - uploadGameCsv        (HTTP POST)  — CSV boxscore upload + aggregation
 *   - recomputeStandings    (HTTP POST)  — rebuild standings cache
 *   - recomputeLeaderboards (HTTP POST)  — rebuild player + team leaderboards
 *   - integrityRecompute    (Scheduled)  — nightly full recompute from source
 *   - integrityRecomputeHttp(HTTP POST)  — manual trigger for integrity recompute
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { handleUploadGameCsv } from "./uploadGameCsv.js";
import {
  recomputeStandings as doStandings,
  recomputePlayerLeaders,
  recomputeTeamLeaders,
} from "./recomputeCache.js";
import {
  integrityRecomputeAll,
  integrityRecomputeSeason,
} from "./integrityRecompute.js";
import { requireAdmin } from "./adminSetup.js";
import type { Response } from "express";

setGlobalOptions({ maxInstances: 10 });

// ---------------------------------------------------------------------------
// 1. Upload CSV boxscore
// ---------------------------------------------------------------------------

/**
 * HTTP endpoint for uploading a CSV boxscore file attached to an existing game.
 *
 * Accepts multipart/form-data POST with fields:
 *   seasonId, gameId, teamId, file (CSV), intervalsFile (optional CSV)
 *
 * Requires Authorization: Bearer <token> with admin:true custom claim.
 */
export const uploadGameCsv = onRequest(
  {
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: true,
  },
  handleUploadGameCsv,
);

// ---------------------------------------------------------------------------
// 2. Recompute standings cache (admin-only HTTP)
// ---------------------------------------------------------------------------

/**
 * POST { seasonId } — rebuild the cached standings doc for a season.
 */
export const recomputeStandings = onRequest(
  { timeoutSeconds: 120, memory: "512MiB", cors: true },
  async (req, res: Response) => {
    try {
      await requireAdmin(req);
    } catch (err: unknown) {
      res.status(401).json({ error: (err as Error).message });
      return;
    }

    const seasonId = (req.body as Record<string, unknown>)?.seasonId;
    if (typeof seasonId !== "string" || !seasonId) {
      res.status(400).json({ error: "seasonId is required" });
      return;
    }

    await doStandings(seasonId);
    res.json({ ok: true, message: `Standings recomputed for ${seasonId}` });
  },
);

// ---------------------------------------------------------------------------
// 3. Recompute leaderboards cache (admin-only HTTP)
// ---------------------------------------------------------------------------

/**
 * POST { seasonId } — rebuild both player and team leaderboard cache docs.
 */
export const recomputeLeaderboards = onRequest(
  { timeoutSeconds: 120, memory: "512MiB", cors: true },
  async (req, res: Response) => {
    try {
      await requireAdmin(req);
    } catch (err: unknown) {
      res.status(401).json({ error: (err as Error).message });
      return;
    }

    const seasonId = (req.body as Record<string, unknown>)?.seasonId;
    if (typeof seasonId !== "string" || !seasonId) {
      res.status(400).json({ error: "seasonId is required" });
      return;
    }

    await Promise.all([
      recomputePlayerLeaders(seasonId),
      recomputeTeamLeaders(seasonId),
    ]);
    res.json({
      ok: true,
      message: `Leaderboards recomputed for ${seasonId}`,
    });
  },
);

// ---------------------------------------------------------------------------
// 4. Nightly integrity recompute (scheduled)
// ---------------------------------------------------------------------------

/**
 * Scheduled function — runs every night at 03:00 UTC.
 * Rebuilds all aggregates from source boxscores, then refreshes caches.
 */
export const integrityRecompute = onSchedule(
  {
    schedule: "0 3 * * *", // every day at 03:00 UTC
    timeZone: "UTC",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async () => {
    const results = await integrityRecomputeAll();
    console.log("[integrityRecompute] Done:", JSON.stringify(results));
  },
);

// ---------------------------------------------------------------------------
// 5. Manual integrity recompute (admin-only HTTP)
// ---------------------------------------------------------------------------

/**
 * POST { seasonId } — trigger a full integrity recompute for one season.
 * Useful for debugging or after manual data fixes.
 */
export const integrityRecomputeHttp = onRequest(
  { timeoutSeconds: 540, memory: "1GiB", cors: true },
  async (req, res: Response) => {
    try {
      await requireAdmin(req);
    } catch (err: unknown) {
      res.status(401).json({ error: (err as Error).message });
      return;
    }

    const seasonId = (req.body as Record<string, unknown>)?.seasonId;
    if (typeof seasonId !== "string" || !seasonId) {
      res.status(400).json({ error: "seasonId is required" });
      return;
    }

    const summary = await integrityRecomputeSeason(seasonId);
    res.json({ ok: true, ...summary });
  },
);
