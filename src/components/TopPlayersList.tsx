'use client';

import { PlayerWithAverages } from '@/types';
import Link from 'next/link';

interface TopPlayersListProps {
  players: PlayerWithAverages[];
  statKey: keyof PlayerWithAverages['averages'];
  statLabel: string;
}

export default function TopPlayersList({ players, statKey, statLabel }: TopPlayersListProps) {
  return (
    <div className="category-list">
      {players.slice(0, 5).map((player, index) => (
        <div
          key={player.id}
          className="player-item"
          onClick={() => (window.location.href = `/players/${player.id}`)}
        >
          <span className="player-rank">{index + 1}</span>
          <div className="player-info">
            <span className="player-name">{player.name}</span>
            <span className="player-team">{player.teamShortName || ''}</span>
          </div>
          <span className="player-stat">
            {player.averages[statKey]} <small>{statLabel}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
