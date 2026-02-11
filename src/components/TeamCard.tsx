'use client';

import { TeamWithAverages } from '@/types';
import Link from 'next/link';

interface TeamCardProps {
  team: TeamWithAverages;
}

export default function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={`/teams/${team.id}`} className="team-card">
      <div className="team-logo" style={{ backgroundColor: team.colors?.primary || '#333' }}>
        {team.shortName}
      </div>
      <h3>{team.name}</h3>
      <p className="team-city">{team.city}</p>
      <p className="team-record">{team.stats.wins} - {team.stats.losses}</p>
    </Link>
  );
}
