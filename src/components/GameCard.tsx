"use client";

import Link from "next/link";
import { GameWithTeams } from "@/types";

interface GameCardProps {
  game: GameWithTeams;
  basePath?: string;
  variant?: "grid" | "ticker";
}

const MN_WEEKDAYS_SHORT = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];
const MN_MONTHS_SHORT = [
  "1 сар",
  "2 сар",
  "3 сар",
  "4 сар",
  "5 сар",
  "6 сар",
  "7 сар",
  "8 сар",
  "9 сар",
  "10 сар",
  "11 сар",
  "12 сар",
];

function formatTickerDate(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  const weekday = MN_WEEKDAYS_SHORT[d.getDay()];
  const month = MN_MONTHS_SHORT[d.getMonth()];
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}

export default function GameCard({
  game,
  basePath = "/game",
  variant = "grid",
}: GameCardProps) {
  const homeWon =
    game.status === "finished" && game.homeScore > game.awayScore;
  const awayWon =
    game.status === "finished" && game.awayScore > game.homeScore;

  const homeRecord = game.homeTeam?.stats
    ? `${game.homeTeam.stats.wins}-${game.homeTeam.stats.losses}`
    : "";
  const awayRecord = game.awayTeam?.stats
    ? `${game.awayTeam.stats.wins}-${game.awayTeam.stats.losses}`
    : "";

  if (variant === "grid") {
    return (
      <Link href={`${basePath}/${game.id}`} className="game-card">
        <div className="game-date">
          <i className="fas fa-calendar"></i>
          {formatTickerDate(game.date)}
          <span className={`game-status ${game.status}`}>
            {game.status === "scheduled"
              ? "Товлогдсон"
              : game.status === "live"
                ? "LIVE"
                : "Дууссан"}
          </span>
        </div>
        <div className="game-teams">
          <div className="game-team">
            <div className="team-info">
              <div
                className="team-logo"
                style={{
                  backgroundColor: game.homeTeam?.colors?.primary || "#333",
                }}
              >
                {game.homeTeam?.shortName?.charAt(0) || "H"}
              </div>
              <span className="team-name-short">
                {game.homeTeam?.shortName || "HOME"}
              </span>
            </div>
            <span
              className={`team-score ${homeWon ? "winner" : ""}`}
            >
              {game.status === "scheduled" ? "-" : game.homeScore}
            </span>
          </div>
          <div className="game-team">
            <div className="team-info">
              <div
                className="team-logo"
                style={{
                  backgroundColor: game.awayTeam?.colors?.primary || "#333",
                }}
              >
                {game.awayTeam?.shortName?.charAt(0) || "A"}
              </div>
              <span className="team-name-short">
                {game.awayTeam?.shortName || "AWAY"}
              </span>
            </div>
            <span
              className={`team-score ${awayWon ? "winner" : ""}`}
            >
              {game.status === "scheduled" ? "-" : game.awayScore}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // NBA-style ticker card
  return (
    <div className="ticker-card">
      <div className="ticker-card-date">{formatTickerDate(game.date)}</div>

      <div className="ticker-card-matchup">
        {game.status === "finished" ? (
          // Finished game - show scores
          <>
            <div className={`ticker-team ${homeWon ? "winner" : "loser"}`}>
              <div
                className="ticker-team-logo"
                style={{
                  backgroundColor: game.homeTeam?.colors?.primary || "#333",
                }}
              >
                {game.homeTeam?.shortName?.charAt(0) || "H"}
              </div>
              <span className="ticker-team-score">{game.homeScore}</span>
              <span className="ticker-vs-label">
                {homeWon ? "Ялсан" : ""}
              </span>
              <span className="ticker-team-score away-score">
                {game.awayScore}
              </span>
              <div
                className="ticker-team-logo"
                style={{
                  backgroundColor: game.awayTeam?.colors?.primary || "#333",
                }}
              >
                {game.awayTeam?.shortName?.charAt(0) || "A"}
              </div>
            </div>
            <div className="ticker-records">
              <span className="ticker-record">{game.homeTeam?.shortName || "HOME"}</span>
              <span className="ticker-record-stats">{homeRecord}</span>
              <span className="ticker-record-stats">{awayRecord}</span>
              <span className="ticker-record">{game.awayTeam?.shortName || "AWAY"}</span>
            </div>
          </>
        ) : game.status === "live" ? (
          // Live game  
          <>
            <div className="ticker-team live-matchup">
              <div
                className="ticker-team-logo"
                style={{
                  backgroundColor: game.homeTeam?.colors?.primary || "#333",
                }}
              >
                {game.homeTeam?.shortName?.charAt(0) || "H"}
              </div>
              <span className="ticker-team-score">{game.homeScore}</span>
              <span className="ticker-live-badge">LIVE</span>
              <span className="ticker-team-score">{game.awayScore}</span>
              <div
                className="ticker-team-logo"
                style={{
                  backgroundColor: game.awayTeam?.colors?.primary || "#333",
                }}
              >
                {game.awayTeam?.shortName?.charAt(0) || "A"}
              </div>
            </div>
            <div className="ticker-records">
              <span className="ticker-record">{game.homeTeam?.shortName || "HOME"}</span>
              <span className="ticker-record-stats">{homeRecord}</span>
              <span className="ticker-record-stats">{awayRecord}</span>
              <span className="ticker-record">{game.awayTeam?.shortName || "AWAY"}</span>
            </div>
          </>
        ) : (
          // Scheduled game - show matchup
          <>
            <div className="ticker-team scheduled-matchup">
              <div
                className="ticker-team-logo"
                style={{
                  backgroundColor: game.homeTeam?.colors?.primary || "#333",
                }}
              >
                {game.homeTeam?.shortName?.charAt(0) || "H"}
              </div>
              <span className="ticker-team-abbr">
                {game.homeTeam?.shortName || "HOME"}
              </span>
              <span className="ticker-vs">vs</span>
              <span className="ticker-team-abbr">
                {game.awayTeam?.shortName || "AWAY"}
              </span>
              <div
                className="ticker-team-logo"
                style={{
                  backgroundColor: game.awayTeam?.colors?.primary || "#333",
                }}
              >
                {game.awayTeam?.shortName?.charAt(0) || "A"}
              </div>
            </div>
            <div className="ticker-records">
              <span className="ticker-record-stats">{homeRecord}</span>
              <span className="ticker-record-stats">{awayRecord}</span>
            </div>
          </>
        )}
      </div>

      <div className="ticker-card-actions">
        {game.status === "finished" ? (
          <>
            <Link
              href={`${basePath}/${game.id}`}
              className="ticker-btn ticker-btn-primary"
            >
              <i className="fas fa-play"></i> Тоглолт харах
            </Link>
            <Link
              href={`${basePath}/${game.id}`}
              className="ticker-btn ticker-btn-secondary"
            >
              <i className="fas fa-chart-bar"></i> Дэлгэрэнгүй
            </Link>
          </>
        ) : game.status === "live" ? (
          <Link
            href={`${basePath}/${game.id}`}
            className="ticker-btn ticker-btn-live"
          >
            <i className="fas fa-play"></i> Шууд үзэх
          </Link>
        ) : (
          <Link
            href={`${basePath}/${game.id}`}
            className="ticker-btn ticker-btn-secondary"
          >
            <i className="fas fa-info-circle"></i> Дэлгэрэнгүй
          </Link>
        )}
      </div>
    </div>
  );
}
