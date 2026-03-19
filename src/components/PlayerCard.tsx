'use client';

import { PlayerWithAverages } from '@/types';
import Link from 'next/link';
import { useState } from 'react';

interface PlayerCardProps {
  player: PlayerWithAverages;
  teamName?: string;
}

export default function PlayerCard({ player, teamName }: PlayerCardProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Link href={`/players/${player.id}`} className="plr-card">
      {/* Player Image/Avatar */}
      <div className="plr-card-image">
        {!imageError && player.image ? (
          <img
            src={player.image}
            alt={player.name}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="plr-card-initials">
            {getInitials(player.name)}
          </div>
        )}
        <div className="plr-card-number">#{player.number}</div>
      </div>

      {/* Content */}
      <div className="plr-card-body">
        <h3 className="plr-card-name">{player.name}</h3>
        <p className="plr-card-pos">{player.position}</p>
        <p className="plr-card-team">{teamName || player.teamShortName}</p>

        {/* Quick Stats */}
        {player.averages && (
          <div className="plr-card-stats">
            <div className="plr-card-stat">
              <span className="plr-stat-val">{player.averages.pointsPerGame}</span>
              <span className="plr-stat-lbl">PPG</span>
            </div>
            <div className="plr-card-stat">
              <span className="plr-stat-val">{player.averages.reboundsPerGame}</span>
              <span className="plr-stat-lbl">RPG</span>
            </div>
            <div className="plr-card-stat">
              <span className="plr-stat-val">{player.averages.assistsPerGame}</span>
              <span className="plr-stat-lbl">APG</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
