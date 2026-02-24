// Types for Sain Girls League

export interface Coach {
  id: string;
  name: string;
  image: string;
}

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface TeamStats {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
}

export type Conference = "east" | "west";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  city: string;
  conference: Conference;
  school: string;
  coach: Coach;
  colors: TeamColors;
  stats: TeamStats;
}

export interface TeamWithAverages extends Team {
  averages: {
    pointsPerGame: string;
    reboundsPerGame: string;
    assistsPerGame: string;
    stealsPerGame: string;
    blocksPerGame: string;
    pointsAllowedPerGame: string;
  };
  winPercentage: string;
  rank?: number;
}

export interface PlayerStats {
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

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: string;
  height: string;
  weight: string;
  age: number;
  image: string;
  country?: string;
  college?: string;
  stats: PlayerStats;
}

export interface PlayerAverages {
  pointsPerGame: string;
  reboundsPerGame: string;
  assistsPerGame: string;
  stealsPerGame: string;
  blocksPerGame: string;
  turnoversPerGame: string;
  foulsPerGame: string;
  minutesPerGame: string;
  fieldGoalPercentage: string;
  threePointPercentage: string;
  freeThrowPercentage: string;
}

export interface PlayerWithAverages extends Player {
  averages: PlayerAverages;
  teamName?: string;
  teamShortName?: string;
  team?: Team;
  rank?: number;
}

export interface GamePlayerStats {
  playerId: string;
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

export interface Game {
  id: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "live" | "finished";
  playerStats: GamePlayerStats[];
}

export interface GameWithTeams extends Game {
  homeTeam: Team | null;
  awayTeam: Team | null;
}

export interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type NewsCategory = "highlight" | "recap" | "announcement" | "interview" | "transfer";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  category: NewsCategory;
  teamIds: string[];
  author: string;
  date: string;
  featured: boolean;
}

export interface NewsArticleWithTeams extends NewsArticle {
  teams: Team[];
}

export interface Database {
  season: Season;
  teams: Team[];
  players: Player[];
  games: Game[];
  news: NewsArticle[];
}
