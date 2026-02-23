'use client';

import { PlayerWithAverages } from '@/types';
import Link from 'next/link';

interface PlayerCardProps {
  player: PlayerWithAverages;
  teamName?: string;
}

export default function PlayerCard({ player, teamName }: PlayerCardProps) {
  return (
    <Link href={`/players/${player.id}`} className="player-card">
      <div className="player-avatar">
        <span>{player.name.charAt(0)}</span>
      </div>
      <div className="player-details">
        <h3>{player.name}</h3>
        <p className="player-position">#{player.number} &middot; {player.position}</p>
        <p className="player-team-name">{teamName || player.teamShortName}</p>
      </div>
      <div className="player-quick-stats">
        <div className="quick-stat">
          <span className="value">{player.averages.pointsPerGame}</span>
          <span className="label">PPG</span>
        </div>
        <div className="quick-stat">
          <span className="value">{player.averages.reboundsPerGame}</span>
          <span className="label">RPG</span>
        </div>
        <div className="quick-stat">
          <span className="value">{player.averages.assistsPerGame}</span>
          <span className="label">APG</span>
        </div>
      </div>
    </Link>
  );
}
