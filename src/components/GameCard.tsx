"use client";

import { GameWithTeams } from "@/types";

interface GameCardProps {
  game: GameWithTeams;
}

const MN_MONTHS = [
  "Нэгдүгээр сар",
  "Хоёрдугаар сар",
  "Гуравдугаар сар",
  "Дөрөвдүгээр сар",
  "Тавдугаар сар",
  "Зургадугаар сар",
  "Долдугаар сар",
  "Наймдугаар сар",
  "Есдүгээр сар",
  "Аравдугаар сар",
  "Арван нэгдүгээр сар",
  "Арван хоёрдугаар сар",
];

function formatDate(dateString: string) {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = MN_MONTHS[d.getMonth()];
  const day = d.getDate();
  return `${year} оны ${month} ${day}`;
}

export default function GameCard({ game }: GameCardProps) {
  return (
    <div className="game-card">
      <div className="game-date">
        <i className="fas fa-calendar"></i>
        {formatDate(game.date)}
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
            className={`team-score ${game.homeScore > game.awayScore ? "winner" : ""}`}
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
            className={`team-score ${game.awayScore > game.homeScore ? "winner" : ""}`}
          >
            {game.status === "scheduled" ? "-" : game.awayScore}
          </span>
        </div>
      </div>
    </div>
  );
}
