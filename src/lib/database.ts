import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Database,
  Team,
  TeamWithAverages,
  Player,
  PlayerWithAverages,
  Game,
  GameWithTeams,
} from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

// Read database
export function readDatabase(): Database {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { teams: [], players: [], games: [], season: {} as any };
  }
}

// Write database
export function writeDatabase(data: Database): boolean {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
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
          ? ((stats.fieldGoalsMade / stats.fieldGoalsAttempted) * 100).toFixed(1)
          : '0.0',
      threePointPercentage:
        stats.threePointersAttempted > 0
          ? ((stats.threePointersMade / stats.threePointersAttempted) * 100).toFixed(1)
          : '0.0',
      freeThrowPercentage:
        stats.freeThrowsAttempted > 0
          ? ((stats.freeThrowsMade / stats.freeThrowsAttempted) * 100).toFixed(1)
          : '0.0',
    },
  };
}

// Calculate team averages
export function calculateTeamAverages(team: Team, players: Player[]): TeamWithAverages {
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
