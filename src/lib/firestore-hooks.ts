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
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FirestoreTeam),
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
          setSeason({ id: d.id, ...d.data() } as FirestoreSeason);
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
  playerId: string;
  playerName: string;
  teamId: string;
  value: number;
  gamesPlayed: number;
}

export interface PlayerLeadersDoc {
  seasonId: string;
  categories: Record<string, LeaderEntry[]>;
  updatedAt: unknown;
}

/**
 * Fetch cached player leaders for a season.
 *
 * Path: `seasons/{seasonId}/cached/playerLeaders`
 */
export function usePlayerLeaders(seasonId: string | null) {
  const [leaders, setLeaders] = useState<Record<string, LeaderEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) {
      setLeaders({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, `seasons/${seasonId}/cached/playerLeaders`);

    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as PlayerLeadersDoc;
          setLeaders(data.categories ?? {});
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[usePlayerLeaders]", err);
        setLoading(false);
      });
  }, [seasonId]);

  return { leaders, loading };
}
