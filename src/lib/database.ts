import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  Database,
  Team,
  TeamWithAverages,
  Player,
  PlayerWithAverages,
  Game,
  GameWithTeams,
  NewsArticle,
  NewsArticleWithTeams,
} from "@/types";

const DB_PATH = path.join(process.cwd(), "data", "database.json");

// Read database
export function readDatabase(): Database {
  try {
    let data = fs.readFileSync(DB_PATH, "utf8");
    // Strip BOM if present
    if (data.charCodeAt(0) === 0xfeff) {
      data = data.slice(1);
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return {
      teams: [],
      players: [],
      games: [],
      news: [],
      sponsors: [],
      season: {} as any,
    };
  }
}

// Write database
export function writeDatabase(data: Database): boolean {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

// Calculate player averages
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

// Calculate team averages
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

  return {
    ...team,
    averages: {
      pointsPerGame: (totalStats.points / gp).toFixed(1),
      reboundsPerGame: (totalStats.rebounds / gp).toFixed(1),
      assistsPerGame: (totalStats.assists / gp).toFixed(1),
      stealsPerGame: (totalStats.steals / gp).toFixed(1),
      blocksPerGame: (totalStats.blocks / gp).toFixed(1),
      pointsAllowedPerGame: (team.stats.pointsAgainst / gp).toFixed(1),
    },
    winPercentage: ((team.stats.wins / gp) * 100).toFixed(1),
  };
}

// Generate unique IDs
export function generateTeamId(): string {
  return `team-${uuidv4().slice(0, 8)}`;
}

export function generatePlayerId(): string {
  return `player-${uuidv4().slice(0, 8)}`;
}

export function generateGameId(): string {
  return `game-${uuidv4().slice(0, 8)}`;
}

// Get all standings (teams with averages sorted by wins)
export function getStandings(): TeamWithAverages[] {
  const db = readDatabase();
  const teamsWithAverages = db.teams.map((team) =>
    calculateTeamAverages(team, db.players),
  );
  return teamsWithAverages.sort((a, b) => b.stats.wins - a.stats.wins);
}

// Get all players with averages
export function getPlayersWithAverages(): PlayerWithAverages[] {
  const db = readDatabase();
  return db.players.map((player) => calculatePlayerAverages(player));
}

// Get all teams with averages
export function getTeamsWithAverages(): TeamWithAverages[] {
  const db = readDatabase();
  return db.teams.map((team) => calculateTeamAverages(team, db.players));
}

// Get team by ID with players
export function getTeamById(
  id: string,
): (TeamWithAverages & { players: PlayerWithAverages[] }) | null {
  const db = readDatabase();
  const team = db.teams.find((t) => t.id === id);
  if (!team) return null;

  const teamWithAverages = calculateTeamAverages(team, db.players);
  const teamPlayers = db.players
    .filter((p) => p.teamId === id)
    .map((player) => calculatePlayerAverages(player));

  return { ...teamWithAverages, players: teamPlayers };
}

// Get player by ID with team
export function getPlayerById(
  id: string,
): (PlayerWithAverages & { team?: Team }) | null {
  const db = readDatabase();
  const player = db.players.find((p) => p.id === id);
  if (!player) return null;

  const playerWithAverages = calculatePlayerAverages(player);
  const team = db.teams.find((t) => t.id === player.teamId);

  return { ...playerWithAverages, team };
}

// Get game by ID with team data and player details
export function getGameById(id: string):
  | (GameWithTeams & {
      homePlayers: PlayerWithAverages[];
      awayPlayers: PlayerWithAverages[];
    })
  | null {
  const db = readDatabase();
  const game = db.games.find((g) => g.id === id);
  if (!game) return null;

  const homeTeam = db.teams.find((t) => t.id === game.homeTeamId) || null;
  const awayTeam = db.teams.find((t) => t.id === game.awayTeamId) || null;
  const homePlayers = db.players
    .filter((p) => p.teamId === game.homeTeamId)
    .map((p) => calculatePlayerAverages(p));
  const awayPlayers = db.players
    .filter((p) => p.teamId === game.awayTeamId)
    .map((p) => calculatePlayerAverages(p));

  return { ...game, homeTeam, awayTeam, homePlayers, awayPlayers };
}

// Get all games with team data
export function getGamesWithTeams(): GameWithTeams[] {
  const db = readDatabase();
  return db.games.map((game) => {
    const homeTeam = db.teams.find((t) => t.id === game.homeTeamId);
    const awayTeam = db.teams.find((t) => t.id === game.awayTeamId);
    return {
      ...game,
      homeTeam: homeTeam || null,
      awayTeam: awayTeam || null,
    } as GameWithTeams;
  });
}

// ============================================
// NEWS HELPERS
// ============================================

export function generateNewsId(): string {
  return `news-${uuidv4().slice(0, 8)}`;
}

export function getNewsArticles(): NewsArticleWithTeams[] {
  const db = readDatabase();
  const articles = db.news || [];
  return articles
    .map((article) => ({
      ...article,
      teams: (article.teamIds || [])
        .map((tid) => db.teams.find((t) => t.id === tid)!)
        .filter(Boolean),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getNewsById(id: string): NewsArticleWithTeams | null {
  const db = readDatabase();
  const article = (db.news || []).find((n) => n.id === id);
  if (!article) return null;
  return {
    ...article,
    teams: (article.teamIds || [])
      .map((tid) => db.teams.find((t) => t.id === tid)!)
      .filter(Boolean),
  };
}

// Get top players by category
export function getTopPlayersByCategory(
  category: string,
  limit: number = 10,
): PlayerWithAverages[] {
  const players = getPlayersWithAverages();

  const sortFunctions: {
    [key: string]: (a: PlayerWithAverages, b: PlayerWithAverages) => number;
  } = {
    points: (a, b) =>
      parseFloat(b.averages.pointsPerGame) -
      parseFloat(a.averages.pointsPerGame),
    rebounds: (a, b) =>
      parseFloat(b.averages.reboundsPerGame) -
      parseFloat(a.averages.reboundsPerGame),
    assists: (a, b) =>
      parseFloat(b.averages.assistsPerGame) -
      parseFloat(a.averages.assistsPerGame),
    steals: (a, b) =>
      parseFloat(b.averages.stealsPerGame) -
      parseFloat(a.averages.stealsPerGame),
    blocks: (a, b) =>
      parseFloat(b.averages.blocksPerGame) -
      parseFloat(a.averages.blocksPerGame),
  };

  const sortFn = sortFunctions[category] || sortFunctions.points;
  return players.sort(sortFn).slice(0, limit);
}
