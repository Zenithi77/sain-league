"use client";

import { TeamWithAverages } from "@/types";
import Link from "next/link";

interface TeamCardProps {
  team: TeamWithAverages;
}

export default function TeamCard({ team }: TeamCardProps) {
  const primaryColor = team.colors?.primary || '#F15F22';

  return (
    <Link href={`/teams/${team.id}`} className="team-card">
      <div
        className="team-card-banner"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}33 0%, ${primaryColor}11 100%)`,
        }}
      />
      <div className="team-card-body">
        <div
          className="team-logo"
          style={{ backgroundColor: primaryColor }}
        >
          {team.shortName}
        </div>
        <h3>{team.name}</h3>
        <p className="team-school">{team.school || team.city}</p>
        <p className="team-conference">{team.conference === 'west' ? 'Баруун бүс' : 'Зүүн бүс'}</p>
        <div className="team-card-stats">
          <div className="team-card-stat">
            <span className="stat-value wins">{team.stats.wins}</span>
            <span className="stat-label">Хожил</span>
          </div>
          <div className="team-card-stat">
            <span className="stat-value losses">{team.stats.losses}</span>
            <span className="stat-label">Хожигдол</span>
          </div>
          <div className="team-card-stat">
            <span className="stat-value">{team.stats.wins + team.stats.losses}</span>
            <span className="stat-label">Тоглолт</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
