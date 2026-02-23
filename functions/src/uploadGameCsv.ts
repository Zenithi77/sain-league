/**
 * uploadGameCsv.ts
 *
 * HTTP Cloud Function that accepts a multipart/form-data POST with:
 *   - seasonId  (string field)
 *   - gameId    (string field) — game must already exist
 *   - teamId    (string field) — which team this CSV belongs to
 *   - file      (CSV file)     — boxscore rows for that team in this game
 *   - intervalsFile (optional CSV) — period/interval summary rows
 *
 * The function:
 *  1. Authenticates the admin via Bearer token + custom claim.
 *  2. Parses the CSV into normalised boxscore rows.
 *  3. Loads any existing boxscores for this game to compute deltas.
 *  4. Writes/overwrites boxscore docs and computes player + team aggregate
 *     increments using atomic FieldValue.increment(delta).
 *  5. Updates game header (scores, status, timestamps).
 *  6. Updates teamAggregates.recentResults transactionally.
 *  7. Optionally writes game summary/intervals doc.
 *  8. Creates per-player game refs.
 *  9. Triggers cache recompute for standings + leaderboards.
 */

import { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import * as Busboy from "busboy";
import { db, FieldValue, requireAdmin } from "./adminSetup.js";
import { parseAndNormalise, safeInt } from "./csvHelpers.js";
import { parseCsv } from "./csvHelpers.js";
import {
  safeUpsertRecentResult,
  GameResult,
  createBatch,
} from "./firestoreHelpers.js";
import {
  gamePath,
  playerAggregatePath,
  teamAggregatePath,
  playerGameRefPath,
  AGGREGATABLE_FIELDS,
  FIRESTORE_BATCH_LIMIT,
} from "./constants.js";
import {
  recomputeStandings,
  recomputePlayerLeaders,
} from "./recomputeCache.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedUpload {
  fields: Record<string, string>;
  files: Record<string, Buffer>;
}

interface DeltaMap {
  [field: string]: number;
}

interface PlayerDelta {
  playerId: string;
  teamId: string;
  newData: Record<string, unknown>;
  deltas: DeltaMap;
  isNew: boolean;
}

// ---------------------------------------------------------------------------
// Multipart parser (busboy)
// ---------------------------------------------------------------------------

/**
 * Parse multipart/form-data from an incoming Cloud Functions request.
 *
 * @param req - The incoming HTTP request
 * @returns Parsed fields and file buffers
 */
function parseMultipart(req: Request): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: Record<string, Buffer> = {};

    const bb = Busboy.default
      ? Busboy.default({ headers: req.headers })
      : (Busboy as unknown as typeof Busboy.default)({ headers: req.headers });

    bb.on("field", (name: string, val: string) => {
      fields[name] = val;
    });

    bb.on(
      "file",
      (
        name: string,
        stream: NodeJS.ReadableStream,
        _info: { filename: string; encoding: string; mimeType: string },
      ) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          files[name] = Buffer.concat(chunks);
        });
      },
    );

    bb.on("finish", () => resolve({ fields, files }));
    bb.on("error", (err: Error) => reject(err));

    // Cloud Functions v2 may buffer the body; feed rawBody or pipe
    if ((req as unknown as { rawBody?: Buffer }).rawBody) {
      bb.end((req as unknown as { rawBody: Buffer }).rawBody);
    } else {
      req.pipe(bb);
    }
  });
}

// ---------------------------------------------------------------------------
// Player ID derivation
// ---------------------------------------------------------------------------

/**
 * Build a deterministic playerId from teamId + playerName.
 *
 * Strategy: `{teamId}__{normalisedName}` where the name is lower-cased,
 * trimmed, and spaces replaced with underscores.
 *
 * If your roster already has globally unique player IDs, replace this
 * function with a lookup from the players sub-collection.
 *
 * @param teamId     - Firestore team document ID
 * @param playerName - Player name from the CSV
 * @returns A deterministic player document ID
 */
function derivePlayerId(teamId: string, playerName: string): string {
  const norm = playerName.trim().toLowerCase().replace(/\s+/g, "_");
  return `${teamId}__${norm}`;
}

// ---------------------------------------------------------------------------
// Numeric extraction helper
// ---------------------------------------------------------------------------

/**
 * Extract the numeric value of a field from a normalised row / Firestore doc.
 * Handles both the flat numeric fields and the expanded slash sub-fields
 * (e.g. fieldGoalsMade, fieldGoalsAttempted).
 *
 * @param data  - Row or doc data
 * @param field - Aggregatable field name
 * @returns The numeric value (0 if missing)
 */
function num(data: Record<string, unknown>, field: string): number {
  const v = data[field];
  if (v === undefined || v === null) return 0;
  return typeof v === "number" ? v : safeInt(v);
}

// ---------------------------------------------------------------------------
// Core upload handler
// ---------------------------------------------------------------------------

/**
 * The main handler for the uploadGameCsv Cloud Function.
 *
 * @param req - Incoming HTTP request
 * @param res - HTTP response
 * @returns void (sends JSON response)
 */
export async function handleUploadGameCsv(
  req: Request,
  res: Response,
): Promise<void> {
  // ---- CORS preflight ----
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.status(204).send("");
    return;
  }

  res.set("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ---- 1. Authenticate ----
  try {
    await requireAdmin(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication failed";
    res.status(401).json({ error: msg });
    return;
  }

  // ---- 2. Parse multipart ----
  let parsed: ParsedUpload;
  try {
    parsed = await parseMultipart(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse upload";
    res.status(400).json({ error: `Multipart parse error: ${msg}` });
    return;
  }

  const { fields, files } = parsed;
  const seasonId = fields.seasonId?.trim();
  const gameId = fields.gameId?.trim();
  const teamId = fields.teamId?.trim();
  const csvBuffer = files.file;

  if (!seasonId || !gameId || !teamId) {
    res
      .status(400)
      .json({ error: "Missing required fields: seasonId, gameId, teamId" });
    return;
  }
  if (!csvBuffer || csvBuffer.length === 0) {
    res.status(400).json({ error: "Missing or empty CSV file" });
    return;
  }

  // ---- 3. Verify game exists & load metadata ----
  const gameRef = db.doc(gamePath(seasonId, gameId));
  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) {
    res
      .status(404)
      .json({ error: `Game ${gameId} not found in season ${seasonId}` });
    return;
  }
  const gameData = gameSnap.data()!;
  const homeTeamId: string = gameData.homeTeamId;
  const awayTeamId: string = gameData.awayTeamId;
  const gameDate: string = gameData.date || new Date().toISOString();
  const gamePhase: string = gameData.phase || "regular"; // e.g. "regular", "playoff"

  const isHomeTeam = teamId === homeTeamId;
  if (teamId !== homeTeamId && teamId !== awayTeamId) {
    res.status(400).json({
      error: `teamId "${teamId}" is neither home (${homeTeamId}) nor away (${awayTeamId}) for this game`,
    });
    return;
  }

  // ---- 4. Parse CSV ----
  const { rows, errors: parseErrors } = parseAndNormalise(csvBuffer);
  if (rows.length === 0) {
    res.status(400).json({ error: "CSV contains no data rows", parseErrors });
    return;
  }

  // ---- 5. Load existing boxscores for this team in this game ----
  const boxscoresCol = db.collection(
    `seasons/${seasonId}/games/${gameId}/boxscores`,
  );
  const existingSnap = await boxscoresCol.where("teamId", "==", teamId).get();
  const existingMap = new Map<string, Record<string, unknown>>();
  existingSnap.forEach((doc) => existingMap.set(doc.id, doc.data()));

  // Track the previous team totals for this side (for game score delta)
  let prevTeamPoints = 0;
  existingMap.forEach((data) => {
    prevTeamPoints += num(data, "points");
  });

  // Also load the previous W/L result for this team (to compute win/loss delta)
  const prevProcessed: boolean = gameData.processedAggregates === true;
  const prevHomeScore: number = gameData.homeScore ?? 0;
  const prevAwayScore: number = gameData.awayScore ?? 0;

  // ---- 6. Compute deltas per player ----
  const playerDeltas: PlayerDelta[] = [];
  const processedPlayerIds = new Set<string>();
  let newTeamPoints = 0;

  for (const row of rows) {
    const playerName = String(row.playerName ?? "").trim();
    if (!playerName) continue;

    const playerId = derivePlayerId(teamId, playerName);
    processedPlayerIds.add(playerId);

    const existing = existingMap.get(playerId);
    const isNew = !existing;

    // Build the full boxscore document data
    const newData: Record<string, unknown> = {
      ...row,
      playerId,
      teamId,
      gameId,
      seasonId,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Compute deltas for every aggregatable field
    const deltas: DeltaMap = {};
    for (const field of AGGREGATABLE_FIELDS) {
      const newVal = num(row as Record<string, unknown>, field);
      const oldVal = existing ? num(existing, field) : 0;
      deltas[field] = newVal - oldVal;
    }

    // gamesPlayed delta: +1 only if this is a brand new boxscore
    deltas.gamesPlayed = isNew ? 1 : 0;

    newTeamPoints += num(row as Record<string, unknown>, "points");
    playerDeltas.push({ playerId, teamId, newData, deltas, isNew });
  }

  // Handle players that were in the old upload but removed in the new CSV
  // (their stats should be subtracted)
  const removedPlayerIds = [...existingMap.keys()].filter(
    (id) => !processedPlayerIds.has(id),
  );
  for (const playerId of removedPlayerIds) {
    const existing = existingMap.get(playerId)!;
    const deltas: DeltaMap = {};
    for (const field of AGGREGATABLE_FIELDS) {
      deltas[field] = -num(existing, field);
    }
    deltas.gamesPlayed = -1;
    playerDeltas.push({
      playerId,
      teamId,
      newData: {}, // will be deleted
      deltas,
      isNew: false,
    });
  }

  // ---- 7. Compute new game score for this side ----
  // We need the OTHER team's score to decide W/L.
  // It may have been uploaded already (stored on the game doc).
  const otherTeamId = isHomeTeam ? awayTeamId : homeTeamId;
  const newHomeScore = isHomeTeam ? newTeamPoints : (gameData.homeScore ?? 0);
  const newAwayScore = isHomeTeam ? (gameData.awayScore ?? 0) : newTeamPoints;
  const thisTeamScore = isHomeTeam ? newHomeScore : newAwayScore;
  const otherTeamScore = isHomeTeam ? newAwayScore : newHomeScore;

  // ---- 8. Batch-write boxscores, aggregate increments, player game refs ----
  let batches = [createBatch()];
  let opCount = 0;

  /**
   * Get the current batch, creating a new one if the limit is approached.
   *
   * @returns The current WriteBatch
   */
  function currentBatch() {
    if (opCount >= FIRESTORE_BATCH_LIMIT) {
      batches.push(createBatch());
      opCount = 0;
    }
    return batches[batches.length - 1];
  }

  // 8a. Write/overwrite boxscore docs & delete removed players
  for (const pd of playerDeltas) {
    const boxRef = boxscoresCol.doc(pd.playerId);
    if (removedPlayerIds.includes(pd.playerId)) {
      currentBatch().delete(boxRef);
      opCount++;
    } else {
      currentBatch().set(boxRef, pd.newData, { merge: false });
      opCount++;
    }
  }

  // 8b. Player aggregate increments
  for (const pd of playerDeltas) {
    // Skip if all deltas are zero
    const hasNonZero = Object.values(pd.deltas).some((d) => d !== 0);
    if (!hasNonZero) continue;

    const aggRef = db.doc(playerAggregatePath(seasonId, pd.playerId));
    const incrFields: Record<string, FirebaseFirestore.FieldValue> = {};
    for (const [field, delta] of Object.entries(pd.deltas)) {
      if (delta !== 0) {
        incrFields[field] = FieldValue.increment(delta);
      }
    }
    // Also store denormalised identity fields
    incrFields.playerName = FieldValue.serverTimestamp(); // placeholder overwritten below

    const batch = currentBatch();
    batch.set(
      aggRef,
      {
        playerId: pd.playerId,
        teamId: pd.teamId,
        seasonId,
        playerName: pd.newData.playerName ?? "",
        jerseyNumber: pd.newData.jerseyNumber ?? 0,
        ...incrFields,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    // Overwrite the identity fields that shouldn't be incremented —
    // set them in a separate update so the increment fields work correctly
    // Actually, FieldValue.increment in a set-merge works fine alongside
    // plain fields. We remove the erroneous serverTimestamp placeholder:
    // The set-merge above already handles it correctly since both plain
    // fields and increment sentinels can coexist in one set({merge:true}).
    opCount++;

    // byPhase increments  (e.g. byPhase.regular.points += delta)
    if (gamePhase) {
      const phaseIncrFields: Record<string, FirebaseFirestore.FieldValue> = {};
      for (const [field, delta] of Object.entries(pd.deltas)) {
        if (delta !== 0) {
          phaseIncrFields[`byPhase.${gamePhase}.${field}`] =
            FieldValue.increment(delta);
        }
      }
      if (Object.keys(phaseIncrFields).length > 0) {
        currentBatch().set(aggRef, phaseIncrFields, { merge: true });
        opCount++;
      }
    }
  }

  // 8c. Team aggregate increments (sum of all player deltas for this team)
  const teamDeltas: DeltaMap = {};
  for (const field of AGGREGATABLE_FIELDS) {
    teamDeltas[field] = 0;
  }
  teamDeltas.gamesPlayed = 0;
  for (const pd of playerDeltas) {
    if (pd.teamId !== teamId) continue;
    for (const [field, delta] of Object.entries(pd.deltas)) {
      teamDeltas[field] = (teamDeltas[field] || 0) + delta;
    }
  }
  // gamesPlayed for the team as a whole: +1 if this is a new upload, 0 if edit
  // (Use max 1 — team only plays the game once regardless of player count)
  if (!prevProcessed) {
    teamDeltas.gamesPlayed = 1;
  } else {
    teamDeltas.gamesPlayed = 0;
  }

  // W/L delta computation
  let winsThisTeamDelta = 0;
  let lossesThisTeamDelta = 0;
  let winsOtherTeamDelta = 0;
  let lossesOtherTeamDelta = 0;

  // New result
  const thisTeamWon = thisTeamScore > otherTeamScore;
  const thisTeamLost = thisTeamScore < otherTeamScore;

  if (prevProcessed) {
    // Previous result for this team side
    const prevThisScore = isHomeTeam ? prevHomeScore : prevAwayScore;
    const prevOtherScore = isHomeTeam ? prevAwayScore : prevHomeScore;
    const prevWon = prevThisScore > prevOtherScore;
    const prevLost = prevThisScore < prevOtherScore;

    // Undo previous
    if (prevWon) {
      winsThisTeamDelta -= 1;
      lossesOtherTeamDelta -= 1;
    }
    if (prevLost) {
      lossesThisTeamDelta -= 1;
      winsOtherTeamDelta -= 1;
    }
  }
  // Apply new
  if (thisTeamWon) {
    winsThisTeamDelta += 1;
    lossesOtherTeamDelta += 1;
  }
  if (thisTeamLost) {
    lossesThisTeamDelta += 1;
    winsOtherTeamDelta += 1;
  }

  teamDeltas.wins = winsThisTeamDelta;
  teamDeltas.losses = lossesThisTeamDelta;
  teamDeltas.pointsFor = isHomeTeam
    ? newHomeScore - prevHomeScore
    : newAwayScore - prevAwayScore;
  teamDeltas.pointsAgainst = isHomeTeam
    ? newAwayScore - prevAwayScore
    : newHomeScore - prevHomeScore;

  const teamAggRef = db.doc(teamAggregatePath(seasonId, teamId));
  {
    const incrFields: Record<string, FirebaseFirestore.FieldValue> = {};
    for (const [field, delta] of Object.entries(teamDeltas)) {
      if (delta !== 0) {
        incrFields[field] = FieldValue.increment(delta);
      }
    }
    if (Object.keys(incrFields).length > 0) {
      currentBatch().set(
        teamAggRef,
        {
          teamId,
          seasonId,
          ...incrFields,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      opCount++;
    }
    // byPhase for team
    if (gamePhase) {
      const phaseIncr: Record<string, FirebaseFirestore.FieldValue> = {};
      for (const [field, delta] of Object.entries(teamDeltas)) {
        if (delta !== 0) {
          phaseIncr[`byPhase.${gamePhase}.${field}`] =
            FieldValue.increment(delta);
        }
      }
      if (Object.keys(phaseIncr).length > 0) {
        currentBatch().set(teamAggRef, phaseIncr, { merge: true });
        opCount++;
      }
    }
  }

  // Other team W/L deltas (only if the result actually changed)
  if (winsOtherTeamDelta !== 0 || lossesOtherTeamDelta !== 0) {
    const otherAggRef = db.doc(teamAggregatePath(seasonId, otherTeamId));
    const otherIncr: Record<string, FirebaseFirestore.FieldValue> = {};
    if (winsOtherTeamDelta !== 0) {
      otherIncr.wins = FieldValue.increment(winsOtherTeamDelta);
    }
    if (lossesOtherTeamDelta !== 0) {
      otherIncr.losses = FieldValue.increment(lossesOtherTeamDelta);
    }
    currentBatch().set(
      otherAggRef,
      {
        teamId: otherTeamId,
        seasonId,
        ...otherIncr,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    opCount++;
  }

  // 8d. Update game header document
  const gameUpdate: Record<string, unknown> = {
    status: "finished",
    processedAggregates: true,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (isHomeTeam) {
    gameUpdate.homeScore = newHomeScore;
  } else {
    gameUpdate.awayScore = newAwayScore;
  }
  currentBatch().set(gameRef, gameUpdate, { merge: true });
  opCount++;

  // 8e. Player → game reference docs
  for (const pd of playerDeltas) {
    if (removedPlayerIds.includes(pd.playerId)) {
      // Delete the game ref for removed players
      const refDoc = db.doc(playerGameRefPath(seasonId, pd.playerId, gameId));
      currentBatch().delete(refDoc);
      opCount++;
    } else {
      const refDoc = db.doc(playerGameRefPath(seasonId, pd.playerId, gameId));
      currentBatch().set(
        refDoc,
        {
          gameId,
          teamId: pd.teamId,
          date: gameDate,
          points: num(pd.newData, "points"),
          totalRebounds: num(pd.newData, "totalRebounds"),
          assists: num(pd.newData, "assists"),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      opCount++;
    }
  }

  // ---- 9. Commit all batches ----
  try {
    await Promise.all(batches.map((b) => b.commit()));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Batch commit failed";
    res.status(500).json({ error: `Firestore write error: ${msg}` });
    return;
  }

  // ---- 10. Transactional recentResults update for this team ----
  const resultChar = thisTeamWon ? "W" : thisTeamLost ? "L" : "D";
  const gameResult: GameResult = {
    gameId,
    opponentId: otherTeamId,
    result: resultChar,
    score: thisTeamScore,
    opponentScore: otherTeamScore,
    date: gameDate,
  };
  try {
    await safeUpsertRecentResult(teamAggRef, gameResult);
  } catch (err) {
    console.error("[uploadGameCsv] recentResults update failed:", err);
    // Non-fatal — the main boxscores are already committed
  }

  // ---- 11. Intervals file (optional) ----
  if (files.intervalsFile && files.intervalsFile.length > 0) {
    try {
      const intervalRows = parseCsv(files.intervalsFile);
      const summaryRef = db.doc(
        `seasons/${seasonId}/games/${gameId}/summary/intervals`,
      );
      await summaryRef.set(
        {
          gameId,
          seasonId,
          periods: intervalRows.map((r) => ({
            period: safeInt(r.period),
            intervalIndex: safeInt(r.intervalIndex),
            startMin: safeInt(r.startMin),
            endMin: safeInt(r.endMin),
            homePoints: safeInt(r.homePoints),
            awayPoints: safeInt(r.awayPoints),
          })),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    } catch (err) {
      console.error("[uploadGameCsv] intervals write failed:", err);
    }
  }

  // ---- 12. Trigger cache recompute (fire-and-forget) ----
  // These are best-effort — if they fail the data is still correct,
  // the cache will just be stale until the next upload.
  recomputeStandings(seasonId).catch((err) =>
    console.error("[uploadGameCsv] standings recompute failed:", err),
  );
  recomputePlayerLeaders(seasonId).catch((err) =>
    console.error("[uploadGameCsv] player leaders recompute failed:", err),
  );

  // ---- 13. Response ----
  res.status(200).json({
    success: true,
    homeScore: newHomeScore,
    awayScore: newAwayScore,
    teamId,
    affectedPlayers: playerDeltas.map((pd) => pd.playerId),
    affectedTeams: [
      teamId,
      ...(winsOtherTeamDelta !== 0 || lossesOtherTeamDelta !== 0
        ? [otherTeamId]
        : []),
    ],
    removedPlayers: removedPlayerIds,
    parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
  });
}
