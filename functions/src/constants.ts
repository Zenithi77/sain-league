/**
 * constants.ts
 *
 * Canonical field names, CSV header mapping, and Firestore collection paths
 * used across all Cloud Functions in this project.
 */

// ---------------------------------------------------------------------------
// Firestore collection / document path helpers
// ---------------------------------------------------------------------------

/** Root season document */
export const seasonPath = (seasonId: string) => `seasons/${seasonId}` as const;

/** Teams sub-collection */
export const teamPath = (seasonId: string, teamId: string) =>
  `seasons/${seasonId}/teams/${teamId}` as const;

/** Players sub-collection */
export const playerPath = (seasonId: string, playerId: string) =>
  `seasons/${seasonId}/players/${playerId}` as const;

/** Games sub-collection */
export const gamePath = (seasonId: string, gameId: string) =>
  `seasons/${seasonId}/games/${gameId}` as const;

/** Boxscore for a specific player in a specific game */
export const boxscorePath = (
  seasonId: string,
  gameId: string,
  playerId: string,
) => `seasons/${seasonId}/games/${gameId}/boxscores/${playerId}` as const;

/** Aggregated per-player stats for the entire season */
export const playerAggregatePath = (seasonId: string, playerId: string) =>
  `seasons/${seasonId}/playerAggregates/${playerId}` as const;

/** Aggregated per-team stats for the entire season */
export const teamAggregatePath = (seasonId: string, teamId: string) =>
  `seasons/${seasonId}/teamAggregates/${teamId}` as const;

/** Cached standings document (overall) */
export const standingsCachePath = (seasonId: string) =>
  `seasons/${seasonId}/cached/standings/overall` as const;

/** Cached player leaders by category */
export const playerLeadersCachePath = (seasonId: string, category: string) =>
  `seasons/${seasonId}/cached/playerLeaders/${category}` as const;

/** Cached team leaders by category */
export const teamLeadersCachePath = (seasonId: string, category: string) =>
  `seasons/${seasonId}/cached/teamLeaders/${category}` as const;

/** Player → game reference (for player game-log) */
export const playerGameRefPath = (
  seasonId: string,
  playerId: string,
  gameId: string,
) => `seasons/${seasonId}/players/${playerId}/games/${gameId}` as const;

// ---------------------------------------------------------------------------
// Canonical boxscore field names (camelCase, used in Firestore documents)
// ---------------------------------------------------------------------------

/**
 * The exact CSV headers the admin UI sends – order matters for positional
 * fallback, but we primarily match by header name.
 *
 * Mapping table:
 *
 *  CSV Header (admin UI)            → Firestore field (camelCase)
 *  ─────────────────────────────────────────────────────────────
 *  jerseyNumber                     → jerseyNumber
 *  playerName                       → playerName
 *  minutesPlayed                    → minutesPlayed
 *  fieldGoals                       → fieldGoals          (e.g. "5/12")
 *  fieldGoalPercentage              → fieldGoalPercentage
 *  twoPointFieldGoals               → twoPointFieldGoals  (e.g. "3/8")
 *  twoPointPercentage               → twoPointPercentage
 *  threePointFieldGoals             → threePointFieldGoals (e.g. "2/4")
 *  threePointPercentage             → threePointPercentage
 *  freeThrows                       → freeThrows          (e.g. "4/5")
 *  freeThrowPercentage              → freeThrowPercentage
 *  offensiveRebounds                → offensiveRebounds
 *  defensiveRebounds                → defensiveRebounds
 *  totalRebounds                    → totalRebounds
 *  assists                          → assists
 *  turnovers                        → turnovers
 *  steals                           → steals
 *  blocks                           → blocks
 *  personalFoulsCommitted           → personalFoulsCommitted
 *  personalFoulsDrawn               → personalFoulsDrawn
 *  plusMinus                         → plusMinus
 *  points                           → points
 */
export const CSV_HEADERS: readonly string[] = [
  "jerseyNumber",
  "playerName",
  "minutesPlayed",
  "fieldGoals",
  "fieldGoalPercentage",
  "twoPointFieldGoals",
  "twoPointPercentage",
  "threePointFieldGoals",
  "threePointPercentage",
  "freeThrows",
  "freeThrowPercentage",
  "offensiveRebounds",
  "defensiveRebounds",
  "totalRebounds",
  "assists",
  "turnovers",
  "steals",
  "blocks",
  "personalFoulsCommitted",
  "personalFoulsDrawn",
  "plusMinus",
  "points",
] as const;

/**
 * Maps every supported header variant (lower-cased) to the canonical
 * camelCase field name stored in Firestore.  Add aliases here if the admin
 * CSV header names ever change or have alternate spellings.
 */
export const HEADER_ALIAS_MAP: Record<string, string> = {
  // Identity mappings (already canonical)
  jerseynumber: "jerseyNumber",
  playername: "playerName",
  minutesplayed: "minutesPlayed",
  fieldgoals: "fieldGoals",
  fieldgoalpercentage: "fieldGoalPercentage",
  twopointfieldgoals: "twoPointFieldGoals",
  twopointpercentage: "twoPointPercentage",
  threepointfieldgoals: "threePointFieldGoals",
  threepointpercentage: "threePointPercentage",
  freethrows: "freeThrows",
  freethrowpercentage: "freeThrowPercentage",
  offensiverebounds: "offensiveRebounds",
  defensiverebounds: "defensiveRebounds",
  totalrebounds: "totalRebounds",
  assists: "assists",
  turnovers: "turnovers",
  steals: "steals",
  blocks: "blocks",
  personalfoulscommitted: "personalFoulsCommitted",
  personalfoulsdrawn: "personalFoulsDrawn",
  plusminus: "plusMinus",
  points: "points",

  // Common aliases – extend as needed
  "#": "jerseyNumber",
  no: "jerseyNumber",
  number: "jerseyNumber",
  name: "playerName",
  player: "playerName",
  min: "minutesPlayed",
  fg: "fieldGoals",
  "fg%": "fieldGoalPercentage",
  "2pt": "twoPointFieldGoals",
  "2p%": "twoPointPercentage",
  "3pt": "threePointFieldGoals",
  "3p%": "threePointPercentage",
  ft: "freeThrows",
  "ft%": "freeThrowPercentage",
  oreb: "offensiveRebounds",
  dreb: "defensiveRebounds",
  reb: "totalRebounds",
  ast: "assists",
  to: "turnovers",
  tov: "turnovers",
  stl: "steals",
  blk: "blocks",
  pf: "personalFoulsCommitted",
  pfd: "personalFoulsDrawn",
  "+/-": "plusMinus",
  pts: "points",
};

/**
 * Fields that MUST be present in every valid boxscore row.
 * Used by csvHelpers.validateRow().
 */
export const REQUIRED_BOXSCORE_FIELDS: readonly string[] = [
  "playerName",
  "points",
] as const;

/**
 * Numeric fields that should be parsed with safeFloat / safeInt.
 * "slash" fields (e.g. "5/12") are stored as-is (string) but also split
 * into made/attempted sub-fields during ingestion.
 */
export const NUMERIC_FIELDS: readonly string[] = [
  "jerseyNumber",
  "minutesPlayed",
  "fieldGoalPercentage",
  "twoPointPercentage",
  "threePointPercentage",
  "freeThrowPercentage",
  "offensiveRebounds",
  "defensiveRebounds",
  "totalRebounds",
  "assists",
  "turnovers",
  "steals",
  "blocks",
  "personalFoulsCommitted",
  "personalFoulsDrawn",
  "plusMinus",
  "points",
] as const;

/**
 * Fields that contain "made/attempted" slash notation (e.g. "5/12").
 * During ingestion these are kept as strings AND split into numeric sub-fields.
 */
export const SLASH_FIELDS: readonly string[] = [
  "fieldGoals",
  "twoPointFieldGoals",
  "threePointFieldGoals",
  "freeThrows",
] as const;

/** Maximum length of the recentResults array stored on team aggregates */
export const MAX_RECENT_RESULTS = 20;

/** Firestore batch op limit — we split batches at this threshold */
export const FIRESTORE_BATCH_LIMIT = 499;

/**
 * Numeric stat fields that are aggregated (incremented) on both
 * playerAggregates and teamAggregates docs.  Slash sub-fields included.
 */
export const AGGREGATABLE_FIELDS: readonly string[] = [
  "minutesPlayed",
  "points",
  "offensiveRebounds",
  "defensiveRebounds",
  "totalRebounds",
  "assists",
  "turnovers",
  "steals",
  "blocks",
  "personalFoulsCommitted",
  "personalFoulsDrawn",
  "plusMinus",
  "fieldGoalsMade",
  "fieldGoalsAttempted",
  "twoPointFieldGoalsMade",
  "twoPointFieldGoalsAttempted",
  "threePointFieldGoalsMade",
  "threePointFieldGoalsAttempted",
  "freeThrowsMade",
  "freeThrowsAttempted",
] as const;
