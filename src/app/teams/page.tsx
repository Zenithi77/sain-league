import Link from 'next/link';
import { getTeamsWithAverages } from '@/lib/database';
import { TeamWithAverages } from '@/types';

export const dynamic = 'force-dynamic';

function DivisionTable({ teams, conference }: { teams: TeamWithAverages[]; conference: 'west' | 'east' }) {
  const isWest = conference === 'west';
  const accentColor = isWest ? '#F15F22' : '#0072bc';

  return (
    <div className={`div2-block div2-${conference}`}>
      {/* Division Header */}
      <div className={`div2-header div2-header-${conference}`}>
        <div className="div2-header-icon">
          <i className="fas fa-shield-alt"></i>
        </div>
        <div className="div2-header-info">
          <h2>{isWest ? 'Баруун бүс' : 'Зүүн бүс'}</h2>
          <span className="div2-team-count">{teams.length} баг</span>
        </div>
      </div>

      {/* Teams List */}
      <div className="div2-teams-list">
        {teams.map((team, i) => {
          const totalGames = team.stats.wins + team.stats.losses;
          const winPct = totalGames > 0 ? (team.stats.wins / totalGames) * 100 : 0;

          return (
            <Link href={`/teams/${team.id}`} key={team.id} className={`div2-team-row ${i < 3 ? 'div2-top-team' : ''}`}>
              {/* Rank */}
              <div className={`div2-rank ${i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : ''}`}>
                {i < 3 ? (
                  <i className="fas fa-trophy"></i>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>

              {/* Team Identity */}
              <div className="div2-team-identity">
                <span
                  className="div2-team-badge"
                  style={{ backgroundColor: team.colors?.primary || accentColor }}
                >
                  {team.shortName}
                </span>
                <div className="div2-team-meta">
                  <span className="div2-team-name">{team.name}</span>
                  <span className="div2-team-school">{team.school}</span>
                </div>
              </div>

              {/* Win Rate Bar */}
              <div className="div2-winrate hide-mobile-sm">
                <div className="div2-winrate-bar">
                  <div
                    className="div2-winrate-fill"
                    style={{
                      width: `${winPct}%`,
                      background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
                    }}
                  />
                </div>
                <span className="div2-winrate-text">{winPct.toFixed(0)}%</span>
              </div>

              {/* Stats */}
              <div className="div2-stats-group">
                <div className="div2-stat">
                  <span className="div2-stat-value wins-col">{team.stats.wins}</span>
                  <span className="div2-stat-label">W</span>
                </div>
                <div className="div2-stat">
                  <span className="div2-stat-value losses-col">{team.stats.losses}</span>
                  <span className="div2-stat-label">L</span>
                </div>
                <div className="div2-stat hide-mobile">
                  <span className="div2-stat-value">{team.stats.gamesPlayed}</span>
                  <span className="div2-stat-label">GP</span>
                </div>
                <div className="div2-stat">
                  <span className="div2-stat-value div2-ppg">{team.averages.pointsPerGame}</span>
                  <span className="div2-stat-label">PPG</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="div2-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function TeamsPage() {
  const teams = getTeamsWithAverages();
  const westTeams = teams
    .filter((t) => t.conference === 'west')
    .sort((a, b) => b.stats.wins - a.stats.wins || a.stats.losses - b.stats.losses);
  const eastTeams = teams
    .filter((t) => t.conference === 'east')
    .sort((a, b) => b.stats.wins - a.stats.wins || a.stats.losses - b.stats.losses);

  return (
    <main className="main-content">
      {/* Page Header */}
      <div className="teams2-page-header">
        <div className="teams2-header-glow"></div>
        <div className="teams2-header-content">
          <h1>
            <span className="teams2-icon-wrap"><i className="fas fa-basketball-ball"></i></span>
            Багууд
          </h1>
          <p className="teams2-subtitle">Sain Girls League 2026 — {teams.length} баг</p>
        </div>
      </div>

      {/* Two division layout */}
      <div className="div2-container">
        <DivisionTable teams={westTeams} conference="west" />
        <DivisionTable teams={eastTeams} conference="east" />
      </div>
    </main>
  );
}
