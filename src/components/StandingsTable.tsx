"use client";

import { CachedStandingEntry } from "@/lib/firestore-hooks";
import { TeamWithAverages } from "@/types";

/* Accept EITHER the new cached Firestore rows or the legacy TeamWithAverages. */
type StandingsRow = CachedStandingEntry | TeamWithAverages;

interface StandingsTableProps {
  standings: StandingsRow[];
  limit?: number;
}

function isCachedEntry(row: StandingsRow): row is CachedStandingEntry {
  return "pct" in row && "gb" in row;
}

export default function StandingsTable({
  standings,
  limit,
}: StandingsTableProps) {
  const displayData = limit ? standings.slice(0, limit) : standings;
  const useCached = displayData.length > 0 && isCachedEntry(displayData[0]);

  return (
    <div className="standings-table-container">
      <table className="standings-table">
        <thead>
          <tr>
            <th>Байр</th>
            <th>Баг</th>
            <th>Тоглолт</th>
            <th>Хожил</th>
            <th>Хожигдол</th>
            <th>PCT</th>
            <th>GB</th>
            {useCached && <th>HOME</th>}
            {useCached && <th>ROAD</th>}
            {useCached && <th>STREAK</th>}
            {useCached && <th>L-10</th>}
            <th>Оноо авсан</th>
            <th>Оноо алдсан</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, index) => {
            if (isCachedEntry(row)) {
              return (
                <tr
                  key={row.teamId}
                  onClick={() =>
                    (window.location.href = `/teams/${row.teamId}`)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <td className="rank">{row.rank}</td>
                  <td>
                    <div className="team-name">
                      <span>{row.teamId}</span>
                    </div>
                  </td>
                  <td>{row.gamesPlayed}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td className="win-pct">{(row.pct * 100).toFixed(1)}%</td>
                  <td>{row.gb === 0 ? "–" : row.gb.toFixed(1)}</td>
                  <td>{row.home}</td>
                  <td>{row.road}</td>
                  <td>{row.streak}</td>
                  <td>{row.l10}</td>
                  <td>{row.pointsFor}</td>
                  <td>{row.pointsAgainst}</td>
                </tr>
              );
            }

            // Legacy TeamWithAverages rows
            const team = row as TeamWithAverages;
            return (
              <tr
                key={team.id}
                onClick={() => (window.location.href = `/teams/${team.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td className="rank">{index + 1}</td>
                <td>
                  <div className="team-name">
                    <div
                      className="team-logo-small"
                      style={{
                        backgroundColor: team.colors?.primary || "#333",
                      }}
                    >
                      {team.shortName?.charAt(0) || "T"}
                    </div>
                    <span>{team.name}</span>
                  </div>
                </td>
                <td>{team.stats.gamesPlayed}</td>
                <td>{team.stats.wins}</td>
                <td>{team.stats.losses}</td>
                <td className="win-pct">{team.winPercentage}%</td>
                <td>–</td>
                <td>{team.stats.pointsFor}</td>
                <td>{team.stats.pointsAgainst}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
