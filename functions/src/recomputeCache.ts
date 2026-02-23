/**
 * recomputeCache.ts
 *
 * Rebuild cached / denormalised documents used by the frontend:
 *
 *   - `recomputeStandings(seasonId)` — full standings table with PCT, GB,
 *      HOME, ROAD, STREAK, L-10.
 *
 *   - `recomputePlayerLeaders(seasonId)` — top-5 player leaders per
 *      stat category (ppg, rpg, apg, 3pm/g, ftm/g, steals, blocks, tov).
 *
 *   - `recomputeTeamLeaders(seasonId)` — top-5 team leaders per category
 *      (ppg, rpg, apg).
 *
 *   - `recomputeAll(seasonId)` — convenience: runs all three.
 *
 * Designed to be called fire-and-forget after an upload, or from cron.
 */

import { db, FieldValue } from "./adminSetup.js";
import {
  standingsCachePath,
  playerLeadersCachePath,
  teamLeadersCachePath,
} from "./constants.js";

// =========================================================================
// Standings
// =========================================================================

/** Shape of one row in the cached standings array. */
interface StandingEntry {
  rank: number;
  teamId: string;
  wins: number;
  losses: number;
  /** Win percentage  wins / (wins + losses), 0-1 */
  pct: number;
  /** Games behind the leader: ((leaderW - W) + (L - leaderL)) / 2 */
  gb: number;
  /** Points scored total */
  pointsFor: number;
  /** Points allowed total */
  pointsAgainst: number;
  /** Point differential */
  diff: number;
  /** Home record string, e.g. "5-2" */
  home: string;
  /** Road record string, e.g. "3-4" */
  road: string;
  /** Current streak, e.g. "W4" or "L2" */
  streak: string;
  /** Last-10 record string, e.g. "7-3" */
  l10: string;
  /** gamesPlayed */
  gamesPlayed: number;
}

/**
 * Rebuild the cached standings document for a season.
 *
 * Reads every doc in `seasons/{seasonId}/teamAggregates`, computes all
 * derived columns the /standings UI needs, sorts, and writes a single
 * document at the cached standings path.
 *
 * @param seasonId - The season to recompute
 * @returns Promise that resolves when the cache doc is written
 */
export async function recomputeStandings(seasonId: string): Promise<void> {
  const aggSnap = await db
    .collection(`seasons/${seasonId}/teamAggregates`)
    .get();

  if (aggSnap.empty) return;

  // Helper to format W-L strings
  const wl = (w: number, l: number) => `${w}-${l}`;

  // First pass — build raw entries
  const raw: Array<{
    teamId: string;
    wins: number;
    losses: number;
    gamesPlayed: number;
    pct: number;
    pointsFor: number;
    pointsAgainst: number;
    diff: number;
    homeWins: number;
    homeLosses: number;
    roadWins: number;
    roadLosses: number;
    streak: string;
    l10: string;
  }> = [];

  aggSnap.forEach((doc) => {
    const d = doc.data();
    const wins: number = d.wins ?? 0;
    const losses: number = d.losses ?? 0;
    const gp: number = d.gamesPlayed ?? wins + losses;
    const pf: number = d.pointsFor ?? 0;
    const pa: number = d.pointsAgainst ?? 0;

    // Home / road splits (stored on aggregate by uploadGameCsv or integrity)
    const homeWins: number = d.homeWins ?? 0;
    const homeLosses: number = d.homeLosses ?? 0;
    const roadWins: number = d.roadWins ?? 0;
    const roadLosses: number = d.roadLosses ?? 0;

    // recentResults is newest-first
    const recent: Array<{ result: string }> = d.recentResults ?? [];

    // Streak — count consecutive identical results from index 0
    let streak = "-";
    if (recent.length > 0) {
      const first = recent[0].result;
      let count = 0;
      for (const r of recent) {
        if (r.result === first) count++;
        else break;
      }
      streak = `${first}${count}`;
    }

    // Last 10
    const last10 = recent.slice(0, 10);
    const l10w = last10.filter((r) => r.result === "W").length;
    const l10l = last10.filter((r) => r.result === "L").length;

    raw.push({
      teamId: doc.id,
      wins,
      losses,
      gamesPlayed: gp,
      pct: wins + losses > 0 ? wins / (wins + losses) : 0,
      pointsFor: pf,
      pointsAgainst: pa,
      diff: pf - pa,
      homeWins,
      homeLosses,
      roadWins,
      roadLosses,
      streak,
      l10: wl(l10w, l10l),
    });
  });

  // Sort: PCT desc → point-diff desc
  raw.sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return b.diff - a.diff;
  });

  // GB relative to the leader
  const leader = raw[0];

  const standings: StandingEntry[] = raw.map((t, idx) => {
    const gb =
      idx === 0 ? 0 : (leader.wins - t.wins + (t.losses - leader.losses)) / 2;
    return {
      rank: idx + 1,
      teamId: t.teamId,
      wins: t.wins,
      losses: t.losses,
      pct: Math.round(t.pct * 1000) / 1000, // e.g. 0.714
      gb: Math.max(gb, 0),
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      diff: t.diff,
      home: wl(t.homeWins, t.homeLosses),
      road: wl(t.roadWins, t.roadLosses),
      streak: t.streak,
      l10: t.l10,
      gamesPlayed: t.gamesPlayed,
    };
  });

  await db.doc(standingsCachePath(seasonId)).set(
    {
      seasonId,
      standings,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
}

// =========================================================================
// Player leaders
// =========================================================================

/**
 * Categories for the player leaderboard.
 *
 * mode = "perGame"  →  value = total / gamesPlayed
 * mode = "pct"      →  value = made / attempted  (skip if attempts < threshold)
 */
const PLAYER_LEADER_CATS: Array<{
  category: string;
  totalField: string;
  mode: "perGame" | "pct";
  /** For pct: numerator field (made) */
  madeField?: string;
  /** For pct: denominator field (attempted) */
  attField?: string;
  /** Minimum attempts to qualify for pct leaders */
  minAttempts?: number;
}> = [
  { category: "ppg", totalField: "points", mode: "perGame" },
  { category: "rpg", totalField: "totalRebounds", mode: "perGame" },
  { category: "apg", totalField: "assists", mode: "perGame" },
  { category: "spg", totalField: "steals", mode: "perGame" },
  { category: "bpg", totalField: "blocks", mode: "perGame" },
  { category: "topg", totalField: "turnovers", mode: "perGame" },
  {
    category: "threepm",
    totalField: "threePointFieldGoalsMade",
    mode: "perGame",
  },
  { category: "ftm", totalField: "freeThrowsMade", mode: "perGame" },
  {
    category: "fgPct",
    totalField: "",
    mode: "pct",
    madeField: "fieldGoalsMade",
    attField: "fieldGoalsAttempted",
    minAttempts: 10,
  },
  {
    category: "threePct",
    totalField: "",
    mode: "pct",
    madeField: "threePointFieldGoalsMade",
    attField: "threePointFieldGoalsAttempted",
    minAttempts: 5,
  },
  {
    category: "ftPct",
    totalField: "",
    mode: "pct",
    madeField: "freeThrowsMade",
    attField: "freeThrowsAttempted",
    minAttempts: 5,
  },
];

const PLAYER_TOP_N = 5;

/**
 * Rebuild cached player-leader documents for every stat category.
 *
 * @param seasonId - The season to recompute
 * @returns Promise that resolves when all leader docs are written
 */
export async function recomputePlayerLeaders(seasonId: string): Promise<void> {
  const aggSnap = await db
    .collection(`seasons/${seasonId}/playerAggregates`)
    .get();

  if (aggSnap.empty) return;

  // Collect all player rows once
  interface PRow {
    playerId: string;
    teamId: string;
    playerName: string;
    jerseyNumber: number;
    gamesPlayed: number;
    [k: string]: unknown;
  }

  const players: PRow[] = [];
  aggSnap.forEach((doc) => {
    const d = doc.data();
    const gp: number = d.gamesPlayed ?? 0;
    if (gp === 0) return;
    players.push({
      playerId: doc.id,
      teamId: d.teamId ?? "",
      playerName: d.playerName ?? "",
      jerseyNumber: d.jerseyNumber ?? 0,
      gamesPlayed: gp,
      ...d, // carry all stat fields
    });
  });

  const batch = db.batch();

  for (const cat of PLAYER_LEADER_CATS) {
    let eligible = [...players];

    // For pct categories, filter by minimum attempts
    if (cat.mode === "pct" && cat.attField && cat.minAttempts) {
      eligible = eligible.filter(
        (p) => num(p, cat.attField!) >= (cat.minAttempts ?? 0),
      );
    }

    // Sort
    eligible.sort((a, b) => {
      if (cat.mode === "perGame") {
        return (
          num(b, cat.totalField) / (b.gamesPlayed || 1) -
          num(a, cat.totalField) / (a.gamesPlayed || 1)
        );
      }
      // pct
      const aPct = safePct(num(a, cat.madeField!), num(a, cat.attField!));
      const bPct = safePct(num(b, cat.madeField!), num(b, cat.attField!));
      return bPct - aPct;
    });

    const leaders = eligible.slice(0, PLAYER_TOP_N).map((p, idx) => {
      let value: number;
      if (cat.mode === "perGame") {
        value = num(p, cat.totalField) / (p.gamesPlayed || 1);
      } else {
        value = safePct(num(p, cat.madeField!), num(p, cat.attField!));
      }
      return {
        rank: idx + 1,
        playerId: p.playerId,
        teamId: p.teamId,
        playerName: p.playerName,
        jerseyNumber: p.jerseyNumber,
        gamesPlayed: p.gamesPlayed,
        value: round2(value),
      };
    });

    const ref = db.doc(playerLeadersCachePath(seasonId, cat.category));
    batch.set(ref, {
      seasonId,
      category: cat.category,
      leaders,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}

// =========================================================================
// Team leaders
// =========================================================================

const TEAM_LEADER_CATS: Array<{ category: string; field: string }> = [
  { category: "ppg", field: "points" },
  { category: "rpg", field: "totalRebounds" },
  { category: "apg", field: "assists" },
  { category: "spg", field: "steals" },
  { category: "bpg", field: "blocks" },
];

const TEAM_TOP_N = 5;

/**
 * Rebuild cached team-leader documents for every stat category.
 *
 * @param seasonId - The season to recompute
 * @returns Promise that resolves when all team leader docs are written
 */
export async function recomputeTeamLeaders(seasonId: string): Promise<void> {
  const aggSnap = await db
    .collection(`seasons/${seasonId}/teamAggregates`)
    .get();

  if (aggSnap.empty) return;

  interface TRow {
    teamId: string;
    gamesPlayed: number;
    [k: string]: unknown;
  }
  const teams: TRow[] = [];
  aggSnap.forEach((doc) => {
    const d = doc.data();
    teams.push({ teamId: doc.id, gamesPlayed: d.gamesPlayed ?? 0, ...d });
  });

  const batch = db.batch();

  for (const cat of TEAM_LEADER_CATS) {
    const sorted = [...teams].sort((a, b) => {
      return (
        num(b, cat.field) / (b.gamesPlayed || 1) -
        num(a, cat.field) / (a.gamesPlayed || 1)
      );
    });

    const leaders = sorted.slice(0, TEAM_TOP_N).map((t, idx) => ({
      rank: idx + 1,
      teamId: t.teamId,
      gamesPlayed: t.gamesPlayed,
      value: round2(num(t, cat.field) / (t.gamesPlayed || 1)),
    }));

    const ref = db.doc(teamLeadersCachePath(seasonId, cat.category));
    batch.set(ref, {
      seasonId,
      category: cat.category,
      leaders,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}

// =========================================================================
// Convenience: recompute everything
// =========================================================================

/**
 * Recompute standings + player leaders + team leaders for a season.
 *
 * @param seasonId - The season to recompute
 * @returns Promise that resolves when all caches are rebuilt
 */
export async function recomputeAll(seasonId: string): Promise<void> {
  await Promise.all([
    recomputeStandings(seasonId),
    recomputePlayerLeaders(seasonId),
    recomputeTeamLeaders(seasonId),
  ]);
}

// =========================================================================
// Tiny helpers
// =========================================================================

/** Safe numeric extraction. */
function num(obj: Record<string, unknown>, field: string): number {
  const v = obj[field];
  if (typeof v === "number") return v;
  if (v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/** made / attempted, 0 when attempted is 0. Returns 0-1 fraction. */
function safePct(made: number, attempted: number): number {
  return attempted > 0 ? made / attempted : 0;
}

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
