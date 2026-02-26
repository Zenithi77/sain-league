"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useTeams,
  useBoxscores,
  BoxscoreEntry,
  FirestoreTeam,
  FirestoreGame,
} from "@/lib/firestore-hooks";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface GameDetailProps {
  gameId: string;
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

const WEEKDAYS = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];

function formatFullDate(dateString: string) {
  const d = new Date(dateString);
  const weekday = WEEKDAYS[d.getDay()];
  const year = d.getFullYear();
  const month = MN_MONTHS[d.getMonth()];
  const day = d.getDate();
  return `${weekday}, ${year} оны ${month} ${day}`;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "scheduled":
      return "Товлогдсон";
    case "live":
      return "LIVE";
    case "finished":
      return "Дууссан";
    default:
      return status;
  }
}

function calcFgPct(made: number, attempted: number): string {
  if (attempted === 0) return "0.0";
  return ((made / attempted) * 100).toFixed(1);
}

interface BoxScoreTableProps {
  teamName: string;
  teamColor: string;
  teamShortName: string;
  entries: BoxscoreEntry[];
  teamScore: number;
  opponentScore: number;
  isHome: boolean;
}

function BoxScoreTable({
  teamName,
  teamColor,
  teamShortName,
  entries,
  teamScore,
  opponentScore,
  isHome,
}: BoxScoreTableProps) {
  // Sort by minutes descending
  const sorted = [...entries].sort((a, b) => b.minutes - a.minutes);

  const totals = sorted.reduce(
    (acc, ps) => ({
      minutes: acc.minutes + ps.minutes,
      fgMade: acc.fgMade + ps.fgMade,
      fgAttempted: acc.fgAttempted + ps.fgAttempted,
      threeMade: acc.threeMade + ps.threeMade,
      threeAttempted: acc.threeAttempted + ps.threeAttempted,
      ftMade: acc.ftMade + ps.ftMade,
      ftAttempted: acc.ftAttempted + ps.ftAttempted,
      rebounds: acc.rebounds + ps.rebounds,
      assists: acc.assists + ps.assists,
      steals: acc.steals + ps.steals,
      blocks: acc.blocks + ps.blocks,
      turnovers: acc.turnovers + ps.turnovers,
      fouls: acc.fouls + ps.fouls,
      points: acc.points + ps.points,
    }),
    {
      minutes: 0,
      fgMade: 0,
      fgAttempted: 0,
      threeMade: 0,
      threeAttempted: 0,
      ftMade: 0,
      ftAttempted: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      points: 0,
    },
  );

  return (
    <div className="box-score-team">
      <div className="box-score-team-header">
        <div
          className="box-score-team-logo"
          style={{ backgroundColor: teamColor }}
        >
          {teamShortName.charAt(0)}
        </div>
        <h3>{teamName}</h3>
      </div>
      <div className="box-score-table-wrapper">
        <table className="box-score-table">
          <thead>
            <tr>
              <th className="player-col">Тоглогч</th>
              <th>MIN</th>
              <th>FGM-A</th>
              <th>FG%</th>
              <th>3PM-A</th>
              <th>3P%</th>
              <th>FTM-A</th>
              <th>FT%</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>TO</th>
              <th>PF</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ps) => {
              return (
                <tr key={ps.id}>
                  <td className="player-col">
                    <Link
                      href={`/players/${ps.id}`}
                      className="box-score-player-link"
                    >
                      <div className="box-score-player-avatar">
                        {ps.playerName?.charAt(0) || "?"}
                      </div>
                      <span>{ps.playerName || "Unknown"}</span>
                    </Link>
                  </td>
                  <td>{ps.minutes}</td>
                  <td>
                    {ps.fgMade}-{ps.fgAttempted}
                  </td>
                  <td>{calcFgPct(ps.fgMade, ps.fgAttempted)}</td>
                  <td>
                    {ps.threeMade}-{ps.threeAttempted}
                  </td>
                  <td>{calcFgPct(ps.threeMade, ps.threeAttempted)}</td>
                  <td>
                    {ps.ftMade}-{ps.ftAttempted}
                  </td>
                  <td>{calcFgPct(ps.ftMade, ps.ftAttempted)}</td>
                  <td>{ps.rebounds}</td>
                  <td>{ps.assists}</td>
                  <td>{ps.steals}</td>
                  <td>{ps.blocks}</td>
                  <td>{ps.turnovers}</td>
                  <td>{ps.fouls}</td>
                  <td className="pts-col">{ps.points}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td className="player-col">
                <strong>Нийт</strong>
              </td>
              <td>{totals.minutes}</td>
              <td>
                {totals.fgMade}-{totals.fgAttempted}
              </td>
              <td>{calcFgPct(totals.fgMade, totals.fgAttempted)}</td>
              <td>
                {totals.threeMade}-{totals.threeAttempted}
              </td>
              <td>{calcFgPct(totals.threeMade, totals.threeAttempted)}</td>
              <td>
                {totals.ftMade}-{totals.ftAttempted}
              </td>
              <td>{calcFgPct(totals.ftMade, totals.ftAttempted)}</td>
              <td>{totals.rebounds}</td>
              <td>{totals.assists}</td>
              <td>{totals.steals}</td>
              <td>{totals.blocks}</td>
              <td>{totals.turnovers}</td>
              <td>{totals.fouls}</td>
              <td className="pts-col">
                <strong>{totals.points}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function GameDetailClient({ gameId }: GameDetailProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "boxscore">("summary");

  // Fetch season, teams, game doc, and boxscores from Firestore
  const SEASON_ID = "U5glRicU51vJcR3L2RRK";
  const { teams: firestoreTeams, loading: teamsLoading } = useTeams();
  const { boxscores, loading: boxLoading } = useBoxscores(SEASON_ID, gameId);
  const [game, setGame] = useState<FirestoreGame | null>(null);
  const [gameLoading, setGameLoading] = useState(true);

  useEffect(() => {
    setGameLoading(true);
    const ref = doc(db, `seasons/${SEASON_ID}/games/${gameId}`);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setGame({ id: snap.id, ...snap.data() } as FirestoreGame);
        }
        setGameLoading(false);
      })
      .catch((err) => {
        console.error("[GameDetailClient] fetch game", err);
        setGameLoading(false);
      });
  }, [gameId]);

  const loading = teamsLoading || boxLoading || gameLoading;

  if (loading) {
    return (
      <div className="game-detail" style={{ padding: 40, textAlign: "center" }}>
        <div className="loading-spinner"></div>
        <p style={{ color: "var(--text-muted)", marginTop: 12 }}>
          Ачаалж байна...
        </p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-detail" style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Тоглолт олдсонгүй.</p>
      </div>
    );
  }

  // Build team lookup
  const teamMap = new Map<string, FirestoreTeam>();
  firestoreTeams.forEach((t) => teamMap.set(t.id, t));
  const homeTeam = teamMap.get(game.homeTeamId) ?? null;
  const awayTeam = teamMap.get(game.awayTeamId) ?? null;

  const isFinished = game.status === "finished";
  const homeWon = game.homeScore > game.awayScore;

  // Split boxscores by team
  const homeBoxscores = boxscores.filter((b) => b.teamId === game.homeTeamId);
  const awayBoxscores = boxscores.filter((b) => b.teamId === game.awayTeamId);

  // Team totals for summary
  function calcTeamTotals(entries: BoxscoreEntry[]) {
    return entries.reduce(
      (acc, ps) => ({
        points: acc.points + ps.points,
        rebounds: acc.rebounds + ps.rebounds,
        assists: acc.assists + ps.assists,
        steals: acc.steals + ps.steals,
        blocks: acc.blocks + ps.blocks,
        turnovers: acc.turnovers + ps.turnovers,
        fgMade: acc.fgMade + ps.fgMade,
        fgAttempted: acc.fgAttempted + ps.fgAttempted,
        threeMade: acc.threeMade + ps.threeMade,
        threeAttempted: acc.threeAttempted + ps.threeAttempted,
        ftMade: acc.ftMade + ps.ftMade,
        ftAttempted: acc.ftAttempted + ps.ftAttempted,
      }),
      {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fgMade: 0,
        fgAttempted: 0,
        threeMade: 0,
        threeAttempted: 0,
        ftMade: 0,
        ftAttempted: 0,
      },
    );
  }

  const homeTotals = calcTeamTotals(homeBoxscores);
  const awayTotals = calcTeamTotals(awayBoxscores);

  // Find top performers
  function getTopPerformer(entries: BoxscoreEntry[]) {
    if (entries.length === 0) return null;
    const top = [...entries].sort((a, b) => b.points - a.points)[0];
    return top;
  }

  const homeTopPerformer = getTopPerformer(homeBoxscores);
  const awayTopPerformer = getTopPerformer(awayBoxscores);

  const summaryCompareStats = [
    {
      label: "FG%",
      home: calcFgPct(homeTotals.fgMade, homeTotals.fgAttempted),
      away: calcFgPct(awayTotals.fgMade, awayTotals.fgAttempted),
    },
    {
      label: "3P%",
      home: calcFgPct(homeTotals.threeMade, homeTotals.threeAttempted),
      away: calcFgPct(awayTotals.threeMade, awayTotals.threeAttempted),
    },
    {
      label: "FT%",
      home: calcFgPct(homeTotals.ftMade, homeTotals.ftAttempted),
      away: calcFgPct(awayTotals.ftMade, awayTotals.ftAttempted),
    },
    {
      label: "Самбар",
      home: homeTotals.rebounds.toString(),
      away: awayTotals.rebounds.toString(),
    },
    {
      label: "Дамжуулалт",
      home: homeTotals.assists.toString(),
      away: awayTotals.assists.toString(),
    },
    {
      label: "Steal",
      home: homeTotals.steals.toString(),
      away: awayTotals.steals.toString(),
    },
    {
      label: "Block",
      home: homeTotals.blocks.toString(),
      away: awayTotals.blocks.toString(),
    },
    {
      label: "Алдаа",
      home: homeTotals.turnovers.toString(),
      away: awayTotals.turnovers.toString(),
    },
  ];

  return (
    <div className="game-detail">
      {/* Scoreboard Header */}
      <div className="game-detail-header">
        <div className="game-detail-status">
          <span className={`game-status-badge ${game.status}`}>
            {getStatusLabel(game.status)}
          </span>
          <span className="game-detail-date">{formatFullDate(game.date)}</span>
        </div>

        <div className="game-detail-scoreboard">
          {/* Home Team */}
          <div className="scoreboard-team">
            <Link
              href={`/teams/${homeTeam?.id}`}
              className="scoreboard-team-link"
            >
              <span className="scoreboard-team-name">
                {homeTeam?.name || "Home"}
              </span>
              <div
                className="scoreboard-team-logo"
                style={{
                  backgroundColor: homeTeam?.colors?.primary || "#333",
                }}
              >
                {homeTeam?.shortName?.charAt(0) || "H"}
              </div>
            </Link>
          </div>

          {/* Score */}
          <div className="scoreboard-score">
            <span
              className={`score-value ${isFinished && homeWon ? "winner" : ""}`}
            >
              {game.status === "scheduled" ? "-" : game.homeScore}
            </span>
            <span className="score-separator">-</span>
            <span
              className={`score-value ${isFinished && !homeWon ? "winner" : ""}`}
            >
              {game.status === "scheduled" ? "-" : game.awayScore}
            </span>
          </div>

          {/* Away Team */}
          <div className="scoreboard-team">
            <Link
              href={`/teams/${awayTeam?.id}`}
              className="scoreboard-team-link"
            >
              <div
                className="scoreboard-team-logo"
                style={{
                  backgroundColor: awayTeam?.colors?.primary || "#333",
                }}
              >
                {awayTeam?.shortName?.charAt(0) || "A"}
              </div>
              <span className="scoreboard-team-name">
                {awayTeam?.name || "Away"}
              </span>
            </Link>
          </div>
        </div>

        <div className="game-detail-record">
          <span>&nbsp;</span>
          <span>&nbsp;</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="game-detail-tabs">
        <button
          className={`game-tab ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          Хураангуй
        </button>
        <button
          className={`game-tab ${activeTab === "boxscore" ? "active" : ""}`}
          onClick={() => setActiveTab("boxscore")}
        >
          Box Score
        </button>
      </div>

      {/* Tab Content */}
      <div className="game-detail-content">
        {activeTab === "summary" && (
          <div className="game-summary">
            {/* Top Performers */}
            {isFinished && (homeTopPerformer || awayTopPerformer) && (
              <div className="top-performers">
                <h3>
                  <i className="fas fa-star"></i> Шилдэг тоглогчид
                </h3>
                <div className="top-performers-grid">
                  {homeTopPerformer && (
                    <Link
                      href={`/players/${homeTopPerformer.id}`}
                      className="top-performer-card"
                    >
                      <div
                        className="performer-team-badge"
                        style={{
                          backgroundColor: homeTeam?.colors?.primary || "#333",
                        }}
                      >
                        {homeTeam?.shortName}
                      </div>
                      <div className="performer-avatar">
                        {homeTopPerformer.playerName.charAt(0)}
                      </div>
                      <div className="performer-info">
                        <span className="performer-name">
                          {homeTopPerformer.playerName}
                        </span>
                        <div className="performer-stats">
                          <span>
                            {homeTopPerformer.points} <small>PTS</small>
                          </span>
                          <span>
                            {homeTopPerformer.rebounds} <small>REB</small>
                          </span>
                          <span>
                            {homeTopPerformer.assists} <small>AST</small>
                          </span>
                        </div>
                      </div>
                    </Link>
                  )}
                  {awayTopPerformer && (
                    <Link
                      href={`/players/${awayTopPerformer.id}`}
                      className="top-performer-card"
                    >
                      <div
                        className="performer-team-badge"
                        style={{
                          backgroundColor: awayTeam?.colors?.primary || "#333",
                        }}
                      >
                        {awayTeam?.shortName}
                      </div>
                      <div className="performer-avatar">
                        {awayTopPerformer.playerName.charAt(0)}
                      </div>
                      <div className="performer-info">
                        <span className="performer-name">
                          {awayTopPerformer.playerName}
                        </span>
                        <div className="performer-stats">
                          <span>
                            {awayTopPerformer.points} <small>PTS</small>
                          </span>
                          <span>
                            {awayTopPerformer.rebounds} <small>REB</small>
                          </span>
                          <span>
                            {awayTopPerformer.assists} <small>AST</small>
                          </span>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Team Comparison */}
            {isFinished && boxscores.length > 0 && (
              <div className="team-comparison">
                <h3>
                  <i className="fas fa-chart-bar"></i> Багийн харьцуулалт
                </h3>
                <div className="comparison-header">
                  <span className="comparison-team-name">
                    {homeTeam?.shortName || "HOME"}
                  </span>
                  <span className="comparison-label">Stat</span>
                  <span className="comparison-team-name">
                    {awayTeam?.shortName || "AWAY"}
                  </span>
                </div>
                {summaryCompareStats.map((stat) => {
                  const homeVal = parseFloat(stat.home);
                  const awayVal = parseFloat(stat.away);
                  const isHigherBetter = stat.label !== "Алдаа";
                  const homeHighlight = isHigherBetter
                    ? homeVal > awayVal
                    : homeVal < awayVal;
                  const awayHighlight = isHigherBetter
                    ? awayVal > homeVal
                    : awayVal < homeVal;

                  return (
                    <div key={stat.label} className="comparison-row">
                      <span
                        className={`comparison-value ${homeHighlight ? "highlight" : ""}`}
                      >
                        {stat.home}
                      </span>
                      <span className="comparison-stat-label">
                        {stat.label}
                      </span>
                      <span
                        className={`comparison-value ${awayHighlight ? "highlight" : ""}`}
                      >
                        {stat.away}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No stats message */}
            {boxscores.length === 0 && (
              <div className="no-stats-message">
                <i className="fas fa-info-circle"></i>
                <p>
                  {game.status === "scheduled"
                    ? "Тоглолт эхлээгүй байна."
                    : "Тоглолтын статистик бүртгэгдээгүй байна."}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "boxscore" && (
          <div className="game-box-score">
            {boxscores.length > 0 ? (
              <>
                <BoxScoreTable
                  teamName={homeTeam?.name || "Home"}
                  teamColor={homeTeam?.colors?.primary || "#333"}
                  teamShortName={homeTeam?.shortName || "H"}
                  entries={homeBoxscores}
                  teamScore={game.homeScore}
                  opponentScore={game.awayScore}
                  isHome={true}
                />
                <BoxScoreTable
                  teamName={awayTeam?.name || "Away"}
                  teamColor={awayTeam?.colors?.primary || "#333"}
                  teamShortName={awayTeam?.shortName || "A"}
                  entries={awayBoxscores}
                  teamScore={game.awayScore}
                  opponentScore={game.homeScore}
                  isHome={false}
                />
              </>
            ) : (
              <div className="no-stats-message">
                <i className="fas fa-info-circle"></i>
                <p>
                  {game.status === "scheduled"
                    ? "Тоглолт эхлээгүй байна."
                    : "Тоглолтын статистик бүртгэгдээгүй байна."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
