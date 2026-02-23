/**
 * integrityRecompute.ts
 *
 * Authoritative full-recompute of all aggregates from boxscore source data.
 *
 * Use this when you suspect aggregate drift (e.g. a bug caused incorrect
 * increments).  It scans every game's boxscores, rebuilds playerAggregates
 * and teamAggregates from scratch, then rebuilds all cached standings and
 * leaderboards.
 *
 * Exported handler is wired to a scheduled Cloud Function (nightly at 03:00).
 * Can also be invoked manually via an HTTP endpoint.
 */

import { db, FieldValue } from "./adminSetup.js";
import { AGGREGATABLE_FIELDS, FIRESTORE_BATCH_LIMIT } from "./constants.js";
import { recomputeAll } from "./recomputeCache.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerAgg {
  playerId: string;
  teamId: string;
  playerName: string;
  jerseyNumber: number;
  gamesPlayed: number;
  [field: string]: unknown;
}

interface TeamAgg {
  teamId: string;
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  roadWins: number;
  roadLosses: number;
  gamesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  /** newest-first array of recent results */
  recentResults: Array<{
    gameId: string;
    opponentId: string;
    result: string;
    score: number;
    opponentScore: number;
    date: string;
  }>;
  [field: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safe number extraction */
function num(data: Record<string, unknown>, field: string): number {
  const v = data[field];
  if (typeof v === "number") return v;
  if (v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/** Initialise a zero-filled aggregate field map. */
function zeroAgg(): Record<string, number> {
  const m: Record<string, number> = {};
  for (const f of AGGREGATABLE_FIELDS) m[f] = 0;
  m.gamesPlayed = 0;
  return m;
}

// ---------------------------------------------------------------------------
// Core recompute
// ---------------------------------------------------------------------------

/**
 * Full integrity recompute for a single season.
 *
 * 1. Reads every `games/{gameId}` doc (for home/away IDs, scores, date).
 * 2. For each game, reads `games/{gameId}/boxscores/*`.
 * 3. Accumulates player-level and team-level totals in memory.
 * 4. Overwrites all playerAggregates and teamAggregates docs.
 * 5. Calls `recomputeAll` to rebuild cached standings + leaderboards.
 *
 * @param seasonId - The season to recompute
 * @returns Summary of what was rebuilt
 */
export async function integrityRecomputeSeason(
  seasonId: string,
): Promise<{ players: number; teams: number; games: number }> {
  console.log(`[integrity] Starting full recompute for season ${seasonId}`);

  // ---- 1. Load all games for this season ----
  const gamesSnap = await db.collection(`seasons/${seasonId}/games`).get();

  if (gamesSnap.empty) {
    console.log("[integrity] No games found, skipping.");
    return { players: 0, teams: 0, games: 0 };
  }

  // Accumulators
  const playerMap = new Map<string, PlayerAgg>();
  const teamMap = new Map<string, TeamAgg>();

  /** Ensure a team entry exists in the map. */
  function ensureTeam(teamId: string): TeamAgg {
    if (!teamMap.has(teamId)) {
      const t: TeamAgg = {
        teamId,
        wins: 0,
        losses: 0,
        homeWins: 0,
        homeLosses: 0,
        roadWins: 0,
        roadLosses: 0,
        gamesPlayed: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        recentResults: [],
        ...zeroAgg(),
      };
      teamMap.set(teamId, t);
    }
    return teamMap.get(teamId)!;
  }

  // Track which teams have already been counted for each game
  // (so gamesPlayed increments once per game per team)
  const teamGamesSet = new Map<string, Set<string>>(); // teamId → Set<gameId>

  let gameCount = 0;

  // ---- 2. Iterate each game ----
  for (const gameDoc of gamesSnap.docs) {
    const gameId = gameDoc.id;
    const gd = gameDoc.data();

    // Only process finished games
    if (gd.status !== "finished") continue;

    const homeTeamId: string = gd.homeTeamId ?? "";
    const awayTeamId: string = gd.awayTeamId ?? "";
    const homeScore: number = gd.homeScore ?? 0;
    const awayScore: number = gd.awayScore ?? 0;
    const gameDate: string = gd.date ?? "";

    if (!homeTeamId || !awayTeamId) continue;
    gameCount++;

    // Ensure team entries
    const homeAgg = ensureTeam(homeTeamId);
    const awayAgg = ensureTeam(awayTeamId);

    // Track gamesPlayed per team (once per game)
    if (!teamGamesSet.has(homeTeamId)) teamGamesSet.set(homeTeamId, new Set());
    if (!teamGamesSet.has(awayTeamId)) teamGamesSet.set(awayTeamId, new Set());

    const homeGames = teamGamesSet.get(homeTeamId)!;
    const awayGames = teamGamesSet.get(awayTeamId)!;

    if (!homeGames.has(gameId)) {
      homeGames.add(gameId);
      homeAgg.gamesPlayed++;
    }
    if (!awayGames.has(gameId)) {
      awayGames.add(gameId);
      awayAgg.gamesPlayed++;
    }

    // W/L and home/road
    const homeWon = homeScore > awayScore;
    const awayWon = awayScore > homeScore;

    if (homeWon) {
      homeAgg.wins++;
      homeAgg.homeWins++;
      awayAgg.losses++;
      awayAgg.roadLosses++;
    } else if (awayWon) {
      awayAgg.wins++;
      awayAgg.roadWins++;
      homeAgg.losses++;
      homeAgg.homeLosses++;
    }
    // (draws: no increment to either)

    // Points for/against
    homeAgg.pointsFor += homeScore;
    homeAgg.pointsAgainst += awayScore;
    awayAgg.pointsFor += awayScore;
    awayAgg.pointsAgainst += homeScore;

    // Recent results (will be sorted by date later)
    homeAgg.recentResults.push({
      gameId,
      opponentId: awayTeamId,
      result: homeWon ? "W" : awayWon ? "L" : "D",
      score: homeScore,
      opponentScore: awayScore,
      date: gameDate,
    });
    awayAgg.recentResults.push({
      gameId,
      opponentId: homeTeamId,
      result: awayWon ? "W" : homeWon ? "L" : "D",
      score: awayScore,
      opponentScore: homeScore,
      date: gameDate,
    });

    // ---- 3. Read boxscores for this game ----
    const boxSnap = await db
      .collection(`seasons/${seasonId}/games/${gameId}/boxscores`)
      .get();

    // Per‑team stat accumulators for this game (for team-level aggregatable fields)
    const gameTeamStats = new Map<string, Record<string, number>>();

    for (const boxDoc of boxSnap.docs) {
      const bd = boxDoc.data();
      const playerId: string = boxDoc.id;
      const teamId: string = bd.teamId ?? "";
      if (!teamId) continue;

      // ---- Player accumulation ----
      if (!playerMap.has(playerId)) {
        const pa: PlayerAgg = {
          playerId,
          teamId,
          playerName: bd.playerName ?? "",
          jerseyNumber: num(bd, "jerseyNumber"),
          gamesPlayed: 0,
          ...zeroAgg(),
        };
        playerMap.set(playerId, pa);
      }
      const pa = playerMap.get(playerId)!;
      pa.gamesPlayed++;
      // Keep latest name / number in case it changed
      pa.playerName = bd.playerName ?? pa.playerName;
      pa.jerseyNumber = num(bd, "jerseyNumber") || pa.jerseyNumber;

      for (const f of AGGREGATABLE_FIELDS) {
        (pa as Record<string, unknown>)[f] =
          (((pa as Record<string, unknown>)[f] as number) ?? 0) + num(bd, f);
      }

      // ---- Team stat accumulation for this game ----
      if (!gameTeamStats.has(teamId)) gameTeamStats.set(teamId, zeroAgg());
      const ts = gameTeamStats.get(teamId)!;
      for (const f of AGGREGATABLE_FIELDS) {
        ts[f] += num(bd, f);
      }
    }

    // Add game-level team stats to the team aggregates
    for (const [tid, stats] of gameTeamStats) {
      const ta = ensureTeam(tid);
      for (const f of AGGREGATABLE_FIELDS) {
        (ta as Record<string, unknown>)[f] =
          (((ta as Record<string, unknown>)[f] as number) ?? 0) + stats[f];
      }
    }
  }

  // ---- 4. Sort recentResults by date desc, trim to 20 ----
  for (const ta of teamMap.values()) {
    ta.recentResults.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    ta.recentResults = ta.recentResults.slice(0, 20);
  }

  // ---- 5. Write all aggregates in batches ----
  let batch = db.batch();
  let opCount = 0;

  const commitIfNeeded = async () => {
    if (opCount >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  };

  // Player aggregates — overwrite
  for (const pa of playerMap.values()) {
    const ref = db.doc(`seasons/${seasonId}/playerAggregates/${pa.playerId}`);
    batch.set(ref, {
      ...pa,
      seasonId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    opCount++;
    await commitIfNeeded();
  }

  // Team aggregates — overwrite
  for (const ta of teamMap.values()) {
    const ref = db.doc(`seasons/${seasonId}/teamAggregates/${ta.teamId}`);
    batch.set(ref, {
      ...ta,
      seasonId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    opCount++;
    await commitIfNeeded();
  }

  // Final commit
  if (opCount > 0) {
    await batch.commit();
  }

  console.log(
    `[integrity] Wrote ${playerMap.size} player aggs, ` +
      `${teamMap.size} team aggs from ${gameCount} games.`,
  );

  // ---- 6. Rebuild cached standings + leaderboards ----
  await recomputeAll(seasonId);
  console.log("[integrity] Cache recompute complete.");

  return {
    players: playerMap.size,
    teams: teamMap.size,
    games: gameCount,
  };
}

// ---------------------------------------------------------------------------
// Multi-season wrapper (for cron)
// ---------------------------------------------------------------------------

/**
 * Recompute all active seasons. Called by the scheduled function.
 *
 * Reads top-level `seasons` collection, picks those with `isActive: true`,
 * and runs `integrityRecomputeSeason` on each.
 *
 * @returns Summary per season
 */
export async function integrityRecomputeAll(): Promise<
  Array<{ seasonId: string; players: number; teams: number; games: number }>
> {
  const seasonsSnap = await db
    .collection("seasons")
    .where("isActive", "==", true)
    .get();

  const results: Array<{
    seasonId: string;
    players: number;
    teams: number;
    games: number;
  }> = [];

  for (const doc of seasonsSnap.docs) {
    const summary = await integrityRecomputeSeason(doc.id);
    results.push({ seasonId: doc.id, ...summary });
  }

  return results;
}
