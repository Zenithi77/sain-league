import Link from 'next/link';
import { getTeamsWithAverages } from '@/lib/database';
import { TeamWithAverages } from '@/types';

export const dynamic = 'force-dynamic';

function ConferenceTable({ teams, conference }: { teams: TeamWithAverages[]; conference: 'west' | 'east' }) {
  const isWest = conference === 'west';
  const accent = isWest ? '#F15F22' : '#0072bc';
  const glowColor = isWest ? 'rgba(241, 95, 34, 0.15)' : 'rgba(0, 114, 188, 0.15)';

  return (
    <div className="sgl-conf-card" style={{ '--conf-accent': accent, '--conf-glow': glowColor } as React.CSSProperties}>
      {/* Glow effect */}
      <div className="sgl-conf-glow"></div>

      {/* Conference header */}
      <div className="sgl-conf-header">
        <div className="sgl-conf-icon" style={{ background: accent }}>
          <i className="fas fa-basketball-ball"></i>
        </div>
        <div>
          <h2 className="sgl-conf-title">{isWest ? 'WESTERN CONFERENCE' : 'EASTERN CONFERENCE'}</h2>
          <span className="sgl-conf-subtitle">{teams.length} баг · {isWest ? 'Баруун' : 'Зүүн'} бүс</span>
        </div>
      </div>

      {/* Table */}
      <table className="sgl-teams-table">
        <thead>
          <tr>
            <th className="sgl-th-rank">#</th>
            <th className="sgl-th-team">Баг</th>
            <th className="sgl-th-num">W</th>
            <th className="sgl-th-num">L</th>
            <th className="sgl-th-num sgl-hide-sm">GP</th>
            <th className="sgl-th-num">PCT</th>
            <th className="sgl-th-num">PPG</th>
            <th className="sgl-th-num sgl-hide-sm">RPG</th>
            <th className="sgl-th-num sgl-hide-sm">APG</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => {
            const total = team.stats.wins + team.stats.losses;
            const pct = total > 0 ? ((team.stats.wins / total) * 100).toFixed(1) : '0.0';

            return (
              <tr key={team.id} className="sgl-team-tr" style={{ animationDelay: `${i * 0.04}s` }}>
                <td className="sgl-td-rank">
                  <span className={`sgl-rank-badge ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="sgl-td-team">
                  <Link href={`/teams/${team.id}`} className="sgl-team-link">
                    <span className="sgl-team-logo" style={{ background: team.colors?.primary || accent }}>
                      {team.shortName}
                    </span>
                    <div className="sgl-team-text">
                      <span className="sgl-team-name">{team.name}</span>
                      <span className="sgl-team-school">{team.school}</span>
                    </div>
                  </Link>
                </td>
                <td className="sgl-td-num sgl-wins">{team.stats.wins}</td>
                <td className="sgl-td-num sgl-losses">{team.stats.losses}</td>
                <td className="sgl-td-num sgl-hide-sm">{team.stats.gamesPlayed}</td>
                <td className="sgl-td-num sgl-pct">
                  <div className="sgl-pct-wrap">
                    <div className="sgl-pct-bar" style={{ width: `${pct}%`, background: accent }}></div>
                    <span>{pct}%</span>
                  </div>
                </td>
                <td className="sgl-td-num sgl-ppg">{team.averages.pointsPerGame}</td>
                <td className="sgl-td-num sgl-hide-sm">{team.averages.reboundsPerGame}</td>
                <td className="sgl-td-num sgl-hide-sm">{team.averages.assistsPerGame}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

  const totalGames = teams.reduce((s, t) => s + t.stats.wins + t.stats.losses, 0) / 2;

  return (
    <main className="main-content">
      {/* Hero header */}
      <div className="sgl-teams-hero">
        <div className="sgl-teams-hero-glow"></div>
        <div className="sgl-teams-hero-content">
          <div className="sgl-teams-hero-left">
            <span className="sgl-tag">SAIN GIRLS LEAGUE 2026</span>
            <h1>Багууд</h1>
            <p>2 бүс, {teams.length} баг, нэг зорилго</p>
          </div>
          <div className="sgl-teams-hero-stats">
            <div className="sgl-hero-stat">
              <span className="sgl-hero-stat-num">{teams.length}</span>
              <span className="sgl-hero-stat-label">Нийт баг</span>
            </div>
            <div className="sgl-hero-stat-divider"></div>
            <div className="sgl-hero-stat">
              <span className="sgl-hero-stat-num">{Math.round(totalGames)}</span>
              <span className="sgl-hero-stat-label">Тоглолт</span>
            </div>
            <div className="sgl-hero-stat-divider"></div>
            <div className="sgl-hero-stat">
              <span className="sgl-hero-stat-num">{teams.length > 0 ? (teams.reduce((s, t) => s + parseFloat(t.averages.pointsPerGame || '0'), 0) / teams.length).toFixed(1) : '0'}</span>
              <span className="sgl-hero-stat-label">AVG PPG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two conference tables side by side */}
      <div className="sgl-conferences-grid">
        <ConferenceTable teams={westTeams} conference="west" />
        <ConferenceTable teams={eastTeams} conference="east" />
      </div>
    </main>
  );
}
