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
} from "@/types";

// Collections
const TEAMS_COLLECTION = "teams";
const PLAYERS_COLLECTION = "players";
const GAMES_COLLECTION = "games";
const SEASON_COLLECTION = "season";
const SPONSORS_COLLECTION = "sponsors";

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
