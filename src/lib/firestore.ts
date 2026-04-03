import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Team,
  TeamWithAverages,
  Player,
  PlayerWithAverages,
  Game,
  GameWithTeams,
  Season,
  Sponsor,
  CoachProfile,
  AvatarTask,
} from "@/types";

// Collections
const TEAMS_COLLECTION = "teams";
const PLAYERS_COLLECTION = "players";
const GAMES_COLLECTION = "games";
const SEASON_COLLECTION = "season";
const SPONSORS_COLLECTION = "sponsors";
const COACHES_COLLECTION = "coaches";
const AVATAR_TASKS_COLLECTION = "avatarTasks";

// ============================================
// TEAMS
// ============================================

export async function getTeams(): Promise<Team[]> {
  const teamsRef = collection(db, TEAMS_COLLECTION);
  const snapshot = await getDocs(teamsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Team);
}

export async function getTeam(id: string): Promise<Team | null> {
  const teamRef = doc(db, TEAMS_COLLECTION, id);
  const snapshot = await getDoc(teamRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Team;
  }
  return null;
}

export async function createTeam(team: Omit<Team, "id">): Promise<string> {
  const teamsRef = collection(db, TEAMS_COLLECTION);
  const newDocRef = doc(teamsRef);
  await setDoc(newDocRef, {
    ...team,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
}

export async function updateTeam(
  id: string,
  data: Partial<Team>,
): Promise<void> {
  const teamRef = doc(db, TEAMS_COLLECTION, id);
  await updateDoc(teamRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  const teamRef = doc(db, TEAMS_COLLECTION, id);
  await deleteDoc(teamRef);
}

// ============================================
// PLAYERS
// ============================================

export async function getPlayers(): Promise<Player[]> {
  const playersRef = collection(db, PLAYERS_COLLECTION);
  const snapshot = await getDocs(playersRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Player);
}

export async function getPlayer(id: string): Promise<Player | null> {
  const playerRef = doc(db, PLAYERS_COLLECTION, id);
  const snapshot = await getDoc(playerRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Player;
  }
  return null;
}

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const playersRef = collection(db, PLAYERS_COLLECTION);
  const q = query(playersRef, where("teamId", "==", teamId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Player);
}

export async function getPlayerByTeamAndNumber(
  teamId: string,
  number: number,
): Promise<Player | null> {
  const playersRef = collection(db, PLAYERS_COLLECTION);
  const q = query(
    playersRef,
    where("teamId", "==", teamId),
    where("number", "==", number),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as Player;
}

export async function createPlayer(
  player: Omit<Player, "id">,
): Promise<string> {
  const playersRef = collection(db, PLAYERS_COLLECTION);
  const newDocRef = doc(playersRef);
  await setDoc(newDocRef, {
    ...player,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
}

export async function updatePlayer(
  id: string,
  data: Partial<Player>,
): Promise<void> {
  const playerRef = doc(db, PLAYERS_COLLECTION, id);
  await updateDoc(playerRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlayer(id: string): Promise<void> {
  const playerRef = doc(db, PLAYERS_COLLECTION, id);
  await deleteDoc(playerRef);
}

export async function getAvatarTasksByPlayer(
  playerId: string,
): Promise<AvatarTask[]> {
  const tasksRef = collection(db, AVATAR_TASKS_COLLECTION);
  const q = query(
    tasksRef,
    where("playerId", "==", playerId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      playerId: data.playerId ?? "",
      imageUrl: data.imageUrl ?? "",
      meshyTaskId: data.meshyTaskId ?? null,
      status: data.status ?? "queued",
      progress: data.progress ?? null,
      modelUrls: data.modelUrls ?? null,
      textureUrls: data.textureUrls ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      taskError: data.taskError ?? null,
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
    } as AvatarTask;
  });
}

// ============================================
// GAMES
// ============================================

export async function getGames(): Promise<Game[]> {
  const gamesRef = collection(db, GAMES_COLLECTION);
  const q = query(gamesRef, orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Game);
}

export async function getGame(id: string): Promise<Game | null> {
  const gameRef = doc(db, GAMES_COLLECTION, id);
  const snapshot = await getDoc(gameRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Game;
  }
  return null;
}

export async function createGame(game: Omit<Game, "id">): Promise<string> {
  const gamesRef = collection(db, GAMES_COLLECTION);
  const newDocRef = doc(gamesRef);
  await setDoc(newDocRef, {
    ...game,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
}

export async function updateGame(
  id: string,
  data: Partial<Game>,
): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, id);
  await updateDoc(gameRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGame(id: string): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, id);
  await deleteDoc(gameRef);
}

// ============================================
// SEASON
// ============================================

export async function getSeason(): Promise<Season | null> {
  const seasonRef = doc(db, SEASON_COLLECTION, "current");
  const snapshot = await getDoc(seasonRef);
  if (snapshot.exists()) {
    return snapshot.data() as Season;
  }
  return null;
}

export async function updateSeason(data: Partial<Season>): Promise<void> {
  const seasonRef = doc(db, SEASON_COLLECTION, "current");
  await setDoc(
    seasonRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ============================================
// BATCH OPERATIONS (For Excel Import)
// ============================================

export async function batchUpdatePlayers(players: Player[]): Promise<void> {
  const batch = writeBatch(db);

  players.forEach((player) => {
    const playerRef = doc(db, PLAYERS_COLLECTION, player.id);
    batch.set(
      playerRef,
      {
        ...player,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();
}

export async function batchUpdateTeams(teams: Team[]): Promise<void> {
  const batch = writeBatch(db);

  teams.forEach((team) => {
    const teamRef = doc(db, TEAMS_COLLECTION, team.id);
    batch.set(
      teamRef,
      {
        ...team,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function calculatePlayerAverages(player: Player): PlayerWithAverages {
  const stats = player.stats;
  const gp = stats.gamesPlayed || 1;

  return {
    ...player,
    averages: {
      pointsPerGame: (stats.totalPoints / gp).toFixed(1),
      reboundsPerGame: (stats.totalRebounds / gp).toFixed(1),
      assistsPerGame: (stats.totalAssists / gp).toFixed(1),
      stealsPerGame: (stats.totalSteals / gp).toFixed(1),
      blocksPerGame: (stats.totalBlocks / gp).toFixed(1),
      turnoversPerGame: (stats.totalTurnovers / gp).toFixed(1),
      foulsPerGame: (stats.totalFouls / gp).toFixed(1),
      minutesPerGame: (stats.minutesPlayed / gp).toFixed(1),
      fieldGoalPercentage:
        stats.fieldGoalsAttempted > 0
          ? ((stats.fieldGoalsMade / stats.fieldGoalsAttempted) * 100).toFixed(
              1,
            )
          : "0.0",
      threePointPercentage:
        stats.threePointersAttempted > 0
          ? (
              (stats.threePointersMade / stats.threePointersAttempted) *
              100
            ).toFixed(1)
          : "0.0",
      freeThrowPercentage:
        stats.freeThrowsAttempted > 0
          ? ((stats.freeThrowsMade / stats.freeThrowsAttempted) * 100).toFixed(
              1,
            )
          : "0.0",
    },
  };
}

export function calculateTeamAverages(
  team: Team,
  players: Player[],
): TeamWithAverages {
  const teamPlayers = players.filter((p) => p.teamId === team.id);
  const gp = team.stats.gamesPlayed || 1;

  let totalStats = {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
  };

  teamPlayers.forEach((player) => {
    totalStats.points += player.stats.totalPoints || 0;
    totalStats.rebounds += player.stats.totalRebounds || 0;
    totalStats.assists += player.stats.totalAssists || 0;
    totalStats.steals += player.stats.totalSteals || 0;
    totalStats.blocks += player.stats.totalBlocks || 0;
  });

  const wins = team.stats.wins || 0;
  const losses = team.stats.losses || 0;
  const totalGames = wins + losses;
  const winPct =
    totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0";

  return {
    ...team,
    winPercentage: winPct,
    averages: {
      pointsPerGame: (totalStats.points / gp).toFixed(1),
      reboundsPerGame: (totalStats.rebounds / gp).toFixed(1),
      assistsPerGame: (totalStats.assists / gp).toFixed(1),
      stealsPerGame: (totalStats.steals / gp).toFixed(1),
      blocksPerGame: (totalStats.blocks / gp).toFixed(1),
      pointsAllowedPerGame: (team.stats.pointsAgainst / gp).toFixed(1),
    },
  };
}

// ============================================
// SPONSORS
// ============================================

export async function getSponsors(): Promise<Sponsor[]> {
  const sponsorsRef = collection(db, SPONSORS_COLLECTION);
  const q = query(sponsorsRef, orderBy("order", "asc"));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Sponsor);
  } catch {
    // If 'order' field index not ready, fall back to unordered
    const snapshot = await getDocs(sponsorsRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Sponsor);
  }
}

export async function getSponsor(id: string): Promise<Sponsor | null> {
  const docRef = doc(db, SPONSORS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Sponsor;
  }
  return null;
}

export async function createSponsor(
  data: Omit<Sponsor, "id">,
): Promise<Sponsor> {
  const sponsorsRef = collection(db, SPONSORS_COLLECTION);
  const newDocRef = doc(sponsorsRef);
  const sponsorData = {
    name: data.name,
    logo: data.logo || "",
    website: data.website || "",
    order: data.order ?? 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(newDocRef, sponsorData);
  return { id: newDocRef.id, ...sponsorData } as unknown as Sponsor;
}

export async function updateSponsor(
  id: string,
  data: Partial<Sponsor>,
): Promise<Sponsor | null> {
  const docRef = doc(db, SPONSORS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const { id: _id, ...updateData } = data;
  await updateDoc(docRef, { ...updateData, updatedAt: serverTimestamp() });
  const updated = await getDoc(docRef);
  return { id: updated.id, ...updated.data() } as Sponsor;
}

export async function deleteSponsor(id: string): Promise<boolean> {
  const docRef = doc(db, SPONSORS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return false;
  await deleteDoc(docRef);
  return true;
}

// Generate unique ID
export function generatePlayerId(): string {
  return "player_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

export function generateGameId(): string {
  return "game_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// ============================================
// COACHES
// ============================================

export async function getCoaches(): Promise<CoachProfile[]> {
  const ref = collection(db, COACHES_COLLECTION);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CoachProfile);
}

export async function getCoach(id: string): Promise<CoachProfile | null> {
  const docRef = doc(db, COACHES_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as CoachProfile;
  }
  return null;
}

export async function getCoachesByTeam(
  teamId: string,
): Promise<CoachProfile[]> {
  const ref = collection(db, COACHES_COLLECTION);
  const q = query(ref, where("teamId", "==", teamId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CoachProfile);
}

export async function createCoach(
  coach: Omit<CoachProfile, "id">,
): Promise<string> {
  const ref = collection(db, COACHES_COLLECTION);
  const newDocRef = doc(ref);
  await setDoc(newDocRef, {
    ...coach,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
}

export async function updateCoach(
  id: string,
  data: Partial<CoachProfile>,
): Promise<void> {
  const docRef = doc(db, COACHES_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCoach(id: string): Promise<void> {
  const docRef = doc(db, COACHES_COLLECTION, id);
  await deleteDoc(docRef);
}

// ============================================
// ACTIVE SEASON + PLAYER AGGREGATES
// ============================================

/** Get the currently active season ID. */
export async function getActiveSeasonId(): Promise<string | null> {
  const q = query(collection(db, "seasons"), where("isActive", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/** Fetch all playerAggregate docs for a season. */
export async function getPlayerAggregates(
  seasonId: string,
): Promise<Record<string, PlayerAggregateData>> {
  const colRef = collection(db, `seasons/${seasonId}/playerAggregates`);
  const snap = await getDocs(colRef);
  const map: Record<string, PlayerAggregateData> = {};
  snap.forEach((d) => {
    const data = d.data();
    if ((data.gamesPlayed ?? 0) > 0) {
      map[d.id] = {
        gamesPlayed: Number(data.gamesPlayed ?? 0),
        minutesPlayed: Number(data.minutesPlayed ?? 0),
        totalPoints: Number(data.points ?? 0),
        totalRebounds: Number(data.totalRebounds ?? 0),
        totalAssists: Number(data.assists ?? 0),
        totalSteals: Number(data.steals ?? 0),
        totalBlocks: Number(data.blocks ?? 0),
        totalTurnovers: Number(data.turnovers ?? 0),
        totalFouls: Number(data.personalFoulsCommitted ?? 0),
        fieldGoalsMade: Number(data.fieldGoalsMade ?? 0),
        fieldGoalsAttempted: Number(data.fieldGoalsAttempted ?? 0),
        threePointersMade: Number(data.threePointFieldGoalsMade ?? 0),
        threePointersAttempted: Number(data.threePointFieldGoalsAttempted ?? 0),
        freeThrowsMade: Number(data.freeThrowsMade ?? 0),
        freeThrowsAttempted: Number(data.freeThrowsAttempted ?? 0),
      };
    }
  });
  return map;
}

/** Re-export type so pages can reference it. */
export interface PlayerAggregateData {
  gamesPlayed: number;
  minutesPlayed: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
  totalTurnovers: number;
  totalFouls: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
}

/**
 * Strip Firestore Timestamps and other non-plain objects so the result
 * can safely pass from Server Components to Client Components.
 */
function stripTimestamps<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Build a default (zeroed) stats object. */
function emptyStats(): PlayerAggregateData {
  return {
    gamesPlayed: 0,
    minutesPlayed: 0,
    totalPoints: 0,
    totalRebounds: 0,
    totalAssists: 0,
    totalSteals: 0,
    totalBlocks: 0,
    totalTurnovers: 0,
    totalFouls: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
  };
}

/**
 * Fetch all players from Firestore, merge with season aggregate stats,
 * calculate averages, and attach team data.
 * Returns the same PlayerWithAverages shape PlayersClient expects.
 */
export async function getPlayersWithAveragesFromFirestore(): Promise<
  PlayerWithAverages[]
> {
  const [players, teams, seasonId] = await Promise.all([
    getPlayers(),
    getTeams(),
    getActiveSeasonId(),
  ]);

  const aggregates = seasonId ? await getPlayerAggregates(seasonId) : {};
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return players.map((player) => {
    const agg = aggregates[player.id] ?? emptyStats();
    const merged: Player = {
      ...player,
      stats: {
        ...agg,
      },
    };
    const withAvg = calculatePlayerAverages(merged);
    const team = teamMap.get(player.teamId);
    return stripTimestamps({
      ...withAvg,
      teamName: team?.name,
      teamShortName: team?.shortName,
      team,
    });
  });
}

/**
 * Fetch a single player from Firestore, merge with aggregate stats,
 * and attach the full team object.
 * Shape matches what /players/[id] page expects.
 */
export async function getPlayerByIdFromFirestore(
  id: string,
): Promise<(PlayerWithAverages & { team?: Team }) | null> {
  const [player, seasonId] = await Promise.all([
    getPlayer(id),
    getActiveSeasonId(),
  ]);
  if (!player) return null;

  let agg: PlayerAggregateData = emptyStats();
  if (seasonId) {
    const docRef = doc(db, `seasons/${seasonId}/playerAggregates`, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      agg = {
        gamesPlayed: Number(data.gamesPlayed ?? 0),
        minutesPlayed: Number(data.minutesPlayed ?? 0),
        totalPoints: Number(data.points ?? 0),
        totalRebounds: Number(data.totalRebounds ?? 0),
        totalAssists: Number(data.assists ?? 0),
        totalSteals: Number(data.steals ?? 0),
        totalBlocks: Number(data.blocks ?? 0),
        totalTurnovers: Number(data.turnovers ?? 0),
        totalFouls: Number(data.personalFoulsCommitted ?? 0),
        fieldGoalsMade: Number(data.fieldGoalsMade ?? 0),
        fieldGoalsAttempted: Number(data.fieldGoalsAttempted ?? 0),
        threePointersMade: Number(data.threePointFieldGoalsMade ?? 0),
        threePointersAttempted: Number(data.threePointFieldGoalsAttempted ?? 0),
        freeThrowsMade: Number(data.freeThrowsMade ?? 0),
        freeThrowsAttempted: Number(data.freeThrowsAttempted ?? 0),
      };
    }
  }

  const merged: Player = { ...player, stats: { ...agg } };
  const withAvg = calculatePlayerAverages(merged);
  const team = await getTeam(player.teamId);

  return stripTimestamps({ ...withAvg, team: team ?? undefined });
}

// ============================================
// TEAMS WITH AVERAGES (Firestore)
// ============================================

export async function getTeamsWithAveragesFromFirestore(): Promise<
  TeamWithAverages[]
> {
  const [teams, players] = await Promise.all([getTeams(), getPlayers()]);
  return teams.map((team) => calculateTeamAverages(team, players));
}

export async function getTeamByIdFromFirestore(
  id: string,
): Promise<(TeamWithAverages & { players: PlayerWithAverages[] }) | null> {
  const [team, allPlayers, seasonId] = await Promise.all([
    getTeam(id),
    getPlayers(),
    getActiveSeasonId(),
  ]);
  if (!team) return null;

  const teamPlayers = allPlayers.filter((p) => p.teamId === id);
  const aggregates = seasonId ? await getPlayerAggregates(seasonId) : {};

  const teamWithAverages = calculateTeamAverages(team, allPlayers);
  const playersWithAverages = teamPlayers.map((player) => {
    const agg = aggregates[player.id] ?? emptyStats();
    const merged: Player = { ...player, stats: { ...agg } };
    return stripTimestamps(calculatePlayerAverages(merged));
  });

  return stripTimestamps({ ...teamWithAverages, players: playersWithAverages });
}

// ============================================
// TEAM GAMES (Firestore)
// ============================================

export async function getGamesWithTeamsFromFirestore(): Promise<
  GameWithTeams[]
> {
  const [games, teams] = await Promise.all([getGames(), getTeams()]);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  return games.map((game) => ({
    ...game,
    homeTeam: teamMap.get(game.homeTeamId) ?? null,
    awayTeam: teamMap.get(game.awayTeamId) ?? null,
  }));
}

export async function getTeamGamesFromFirestore(
  teamId: string,
): Promise<{ upcoming: GameWithTeams[]; recent: GameWithTeams[] }> {
  const allGames = await getGamesWithTeamsFromFirestore();
  const teamGames = allGames.filter(
    (g) => g.homeTeamId === teamId || g.awayTeamId === teamId,
  );

  const upcoming = teamGames
    .filter((g) => g.status === "scheduled" || g.status === "live")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const recent = teamGames
    .filter((g) => g.status === "finished")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { upcoming, recent };
}
