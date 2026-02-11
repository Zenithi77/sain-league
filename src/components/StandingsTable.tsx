'use client';

import Link from 'next/link';
import { TeamWithAverages } from '@/types';

interface StandingsTableProps {
  standings: TeamWithAverages[];
  limit?: number;
}

export default function StandingsTable({ standings, limit }: StandingsTableProps) {
  const displayData = limit ? standings.slice(0, limit) : standings;

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
            <th>Оноо авсан</th>
            <th>Оноо алдсан</th>
            <th>Хувь</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((team, index) => (
            <tr key={team.id} onClick={() => window.location.href = `/teams/${team.id}`}>
              <td className="rank">{index + 1}</td>
              <td>
                <div className="team-name">
                  <div
                    className="team-logo-small"
                    style={{ backgroundColor: team.colors?.primary || '#333' }}
                  >
                    {team.shortName?.charAt(0) || 'T'}
                  </div>
                  <span>{team.name}</span>
                </div>
              </td>
              <td>{team.stats.gamesPlayed}</td>
              <td>{team.stats.wins}</td>
              <td>{team.stats.losses}</td>
              <td>{team.stats.pointsFor}</td>
              <td>{team.stats.pointsAgainst}</td>
              <td className="win-pct">{team.winPercentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
