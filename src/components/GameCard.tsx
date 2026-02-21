'use client';

import { GameWithTeams } from '@/types';

interface GameCardProps {
  game: GameWithTeams;
}

// Consistent date formatting to avoid hydration mismatch
function formatDate(dateString: string): string {
  const months = [
    '1-р сарын', '2-р сарын', '3-р сарын', '4-р сарын',
    '5-р сарын', '6-р сарын', '7-р сарын', '8-р сарын',
    '9-р сарын', '10-р сарын', '11-р сарын', '12-р сарын'
  ];
  
  const date = new Date(dateString + 'T00:00:00');
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();
  
  return `${year} оны ${month} ${day}`;
}

export default function GameCard({ game }: GameCardProps) {
  return (
    <div className="game-card">
      <div className="game-date">
        <i className="fas fa-calendar"></i>
        {formatDate(game.date)}
        <span className={`game-status ${game.status}`}>
          {game.status === 'scheduled' ? 'Товлогдсон' : game.status === 'live' ? 'LIVE' : 'Дууссан'}
        </span>
      </div>
      <div className="game-teams">
        <div className="game-team">
          <div className="team-info">
            <div
              className="team-logo"
              style={{ backgroundColor: game.homeTeam?.colors?.primary || '#333' }}
            >
              {game.homeTeam?.shortName?.charAt(0) || 'H'}
            </div>
            <span className="team-name-short">{game.homeTeam?.shortName || 'HOME'}</span>
          </div>
          <span className={`team-score ${game.homeScore > game.awayScore ? 'winner' : ''}`}>
            {game.status === 'scheduled' ? '-' : game.homeScore}
          </span>
        </div>
        <div className="game-team">
          <div className="team-info">
            <div
              className="team-logo"
              style={{ backgroundColor: game.awayTeam?.colors?.primary || '#333' }}
            >
              {game.awayTeam?.shortName?.charAt(0) || 'A'}
            </div>
            <span className="team-name-short">{game.awayTeam?.shortName || 'AWAY'}</span>
          </div>
          <span className={`team-score ${game.awayScore > game.homeScore ? 'winner' : ''}`}>
            {game.status === 'scheduled' ? '-' : game.awayScore}
          </span>
        </div>
      </div>
    </div>
  );
}
