/**
 * firestore-hooks.ts
 *
 * React hooks for reading Firestore data on the client side.
 * These replace the old database.json reads with live Firestore queries.
 */

"use client";

import { useState, useEffect } from "react";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

// ---------------------------------------------------------------------------
// Generic Firestore helpers
// ---------------------------------------------------------------------------

/** Read a single document once (no realtime). */
export async function fetchDoc<T>(path: string): Promise<T | null> {
  const snap = await getDoc(doc(db, path));
  return snap.exists() ? (snap.data() as T) : null;
}

/** Read all docs in a collection once. */
export async function fetchCollection<T>(
  collectionPath: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = constraints.length
    ? query(collection(db, collectionPath), ...constraints)
    : collection(db, collectionPath);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

// ---------------------------------------------------------------------------
// Standings hook (realtime)
// ---------------------------------------------------------------------------

export interface CachedStandingEntry {
  rank: number;
  teamId: string;
  wins: number;
  losses: number;
  pct: number;
  gb: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  home: string;
  road: string;
  streak: string;
  l10: string;
  gamesPlayed: number;
}

interface CachedStandingsDoc {
  seasonId: string;
  standings: CachedStandingEntry[];
  updatedAt: unknown;
}

/**
 * Subscribe to the cached standings document for a season.
 *
 * Path: `seasons/{seasonId}/cached/standings`
 */
export function useStandings(seasonId: string | null) {
  const [standings, setStandings] = useState<CachedStandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seasonId) {
      setStandings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, `seasons/${seasonId}/cached/standings`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CachedStandingsDoc;
          setStandings(data.standings ?? []);
        } else {
          setStandings([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useStandings]", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [seasonId]);

  return { standings, loading, error };
}

// ---------------------------------------------------------------------------
// Boxscores hook
// ---------------------------------------------------------------------------

export interface BoxscoreEntry {
  id: string; // playerId = doc ID
  teamId: string;
  playerName: string;
  jerseyNumber: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fgMade: number;
  fgAttempted: number;
  threeMade: number;
  threeAttempted: number;
  ftMade: number;
  ftAttempted: number;
}

/**
 * Fetch boxscores for a specific game (one-shot, not realtime).
 *
 * Path: `seasons/{seasonId}/games/{gameId}/boxscores`
 */
export function useBoxscores(seasonId: string | null, gameId: string | null) {
  const [boxscores, setBoxscores] = useState<BoxscoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seasonId || !gameId) {
      setBoxscores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(
      db,
      `seasons/${seasonId}/games/${gameId}/boxscores`,
    );

    getDocs(colRef)
      .then((snap) => {
        const rows = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            teamId: raw.teamId ?? "",
            playerName: raw.playerName ?? "",
            jerseyNumber: raw.jerseyNumber ?? 0,
            minutes: raw.minutesPlayed ?? raw.minutes ?? 0,
            points: raw.points ?? 0,
            rebounds: raw.totalRebounds ?? raw.rebounds ?? 0,
            assists: raw.assists ?? 0,
            steals: raw.steals ?? 0,
            blocks: raw.blocks ?? 0,
            turnovers: raw.turnovers ?? 0,
            fouls: raw.personalFoulsCommitted ?? raw.fouls ?? 0,
            fgMade: raw.fieldGoalsMade ?? raw.fgMade ?? 0,
            fgAttempted: raw.fieldGoalsAttempted ?? raw.fgAttempted ?? 0,
            threeMade: raw.threePointFieldGoalsMade ?? raw.threeMade ?? 0,
            threeAttempted:
              raw.threePointFieldGoalsAttempted ?? raw.threeAttempted ?? 0,
            ftMade: raw.freeThrowsMade ?? raw.ftMade ?? 0,
            ftAttempted: raw.freeThrowsAttempted ?? raw.ftAttempted ?? 0,
          } as BoxscoreEntry;
        });
        setBoxscores(rows);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useBoxscores]", err);
        setError(err.message);
        setLoading(false);
      });
  }, [seasonId, gameId]);

  return { boxscores, loading, error };
}

// ---------------------------------------------------------------------------
// Games list hook (for schedule / admin game picker)
// ---------------------------------------------------------------------------

export interface FirestoreGame {
  id: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: string;
}

/**
 * Fetch all games for a season, ordered by date.
 */
export function useGames(seasonId: string | null) {
  const [games, setGames] = useState<FirestoreGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) {
      setGames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, `seasons/${seasonId}/games`);
    const q = query(colRef, orderBy("date", "asc"));

    getDocs(q)
      .then((snap) => {
        setGames(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FirestoreGame),
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useGames]", err);
        setLoading(false);
      });
  }, [seasonId]);

  return { games, loading };
}

// ---------------------------------------------------------------------------
// Teams list hook
// ---------------------------------------------------------------------------

export interface FirestoreTeam {
  id: string;
  name: string;
  shortName: string;
  city: string;
  conference: "east" | "west";
  school: string;
  colors: { primary: string; secondary: string };
  [key: string]: unknown;
}

/**
 * Fetch all teams from the top-level `teams` collection.
 */
export function useTeams(_seasonId?: string | null) {
  const [teams, setTeams] = useState<FirestoreTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "teams");

    getDocs(colRef)
      .then((snap) => {
        setTeams(
          snap.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              name: String(raw.name ?? ""),
              shortName: String(raw.shortName ?? ""),
              city: String(raw.city ?? ""),
              conference: (raw.conference ?? "east") as "east" | "west",
              school: String(raw.school ?? ""),
              colors: raw.colors ?? { primary: "#333", secondary: "#666" },
            } as FirestoreTeam;
          }),
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useTeams]", err);
        setLoading(false);
      });
  }, []);

  return { teams, loading };
}

// ---------------------------------------------------------------------------
// Active season hook
// ---------------------------------------------------------------------------

export interface FirestoreSeason {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

/**
 * Fetch the currently active season.
 */
export function useActiveSeason() {
  const [season, setSeason] = useState<FirestoreSeason | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "seasons"), where("isActive", "==", true));

    getDocs(q)
      .then((snap) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          const raw = d.data();
          setSeason({
            id: d.id,
            name: String(raw.name ?? ""),
            year: Number(raw.year ?? 0),
            startDate: String(raw.startDate ?? ""),
            endDate: String(raw.endDate ?? ""),
            isActive: !!raw.isActive,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useActiveSeason]", err);
        setLoading(false);
      });
  }, []);

  return { season, loading };
}

// ---------------------------------------------------------------------------
// Player Leaders hook (cached leaderboard)
// ---------------------------------------------------------------------------

export interface LeaderEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  jerseyNumber?: number;
  value: number;
  gamesPlayed: number;
}

export interface TeamLeaderEntry {
  rank: number;
  teamId: string;
  value: number;
  gamesPlayed: number;
}

// ---------------------------------------------------------------------------
// Raw aggregate interfaces
// ---------------------------------------------------------------------------

export interface PlayerAggregateDoc {
  playerId: string;
  teamId: string;
  playerName: string;
  jerseyNumber: number;
  gamesPlayed: number;
  points: number;
  totalRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutesPlayed: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointFieldGoalsMade: number;
  threePointFieldGoalsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  personalFoulsCommitted: number;
  [key: string]: unknown;
}

export interface TeamAggregateDoc {
  teamId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number;
  totalRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Player Aggregates hook
// ---------------------------------------------------------------------------

/**
 * Fetch all player aggregate docs for a season.
 *
 * Path: `seasons/{seasonId}/playerAggregates`
 */
export function usePlayerAggregates(seasonId: string | null) {
  const [aggregates, setAggregates] = useState<PlayerAggregateDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) {
      setAggregates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, `seasons/${seasonId}/playerAggregates`);

    getDocs(colRef)
      .then((snap) => {
        const rows: PlayerAggregateDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if ((data.gamesPlayed ?? 0) > 0) {
            rows.push({
              playerId: d.id,
              teamId: String(data.teamId ?? ""),
              playerName: String(data.playerName ?? ""),
              jerseyNumber: Number(data.jerseyNumber ?? 0),
              gamesPlayed: Number(data.gamesPlayed ?? 0),
              points: Number(data.points ?? 0),
              totalRebounds: data.totalRebounds ?? 0,
              assists: data.assists ?? 0,
              steals: data.steals ?? 0,
              blocks: data.blocks ?? 0,
              turnovers: data.turnovers ?? 0,
              minutesPlayed: data.minutesPlayed ?? 0,
              fieldGoalsMade: data.fieldGoalsMade ?? 0,
              fieldGoalsAttempted: data.fieldGoalsAttempted ?? 0,
              threePointFieldGoalsMade: data.threePointFieldGoalsMade ?? 0,
              threePointFieldGoalsAttempted:
                data.threePointFieldGoalsAttempted ?? 0,
              freeThrowsMade: data.freeThrowsMade ?? 0,
              freeThrowsAttempted: data.freeThrowsAttempted ?? 0,
              personalFoulsCommitted: data.personalFoulsCommitted ?? 0,
            });
          }
        });
        setAggregates(rows);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[usePlayerAggregates]", err);
        setLoading(false);
      });
  }, [seasonId]);

  return { aggregates, loading };
}

// ---------------------------------------------------------------------------
// Team Aggregates hook
// ---------------------------------------------------------------------------

/**
 * Fetch all team aggregate docs for a season.
 *
 * Path: `seasons/{seasonId}/teamAggregates`
 */
export function useTeamAggregates(seasonId: string | null) {
  const [aggregates, setAggregates] = useState<TeamAggregateDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) {
      setAggregates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, `seasons/${seasonId}/teamAggregates`);

    getDocs(colRef)
      .then((snap) => {
        const rows: TeamAggregateDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          rows.push({
            teamId: d.id,
            gamesPlayed: data.gamesPlayed ?? 0,
            wins: data.wins ?? 0,
            losses: data.losses ?? 0,
            pointsFor: data.pointsFor ?? 0,
            pointsAgainst: data.pointsAgainst ?? 0,
            points: data.points ?? 0,
            totalRebounds: data.totalRebounds ?? 0,
            assists: data.assists ?? 0,
            steals: data.steals ?? 0,
            blocks: data.blocks ?? 0,
            turnovers: data.turnovers ?? 0,
          });
        });
        setAggregates(rows);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useTeamAggregates]", err);
        setLoading(false);
      });
  }, [seasonId]);

  return { aggregates, loading };
}
