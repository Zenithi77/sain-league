import Link from 'next/link';
import { getTeamsWithAverages } from '@/lib/database';
import { TeamWithAverages } from '@/types';

export const dynamic = 'force-dynamic';

function ConferenceTable({ teams, conference }: { teams: TeamWithAverages[]; conference: 'west' | 'east' }) {
  const isWest = conference === 'west';
  const accent = isWest ? '#F15F22' : '#0072bc';

  return (
    <div className="odoo-conf-card">
      {/* Conference header bar */}
      <div className="odoo-conf-header" style={{ borderLeftColor: accent }}>
        <div className="odoo-conf-badge" style={{ background: accent }}>
          <i className="fas fa-basketball-ball"></i>
        </div>
        <div className="odoo-conf-title-group">
          <h2 className="odoo-conf-title">{isWest ? 'Western Conference' : 'Eastern Conference'}</h2>
          <span className="odoo-conf-count">{teams.length} баг</span>
        </div>
      </div>

      {/* Table header */}
      <div className="odoo-table-head">
        <span className="odoo-th odoo-th-rank">#</span>
        <span className="odoo-th odoo-th-team">Баг</span>
        <span className="odoo-th odoo-th-stat">W</span>
        <span className="odoo-th odoo-th-stat">L</span>
        <span className="odoo-th odoo-th-stat hide-mobile">GP</span>
        <span className="odoo-th odoo-th-stat">WIN%</span>
        <span className="odoo-th odoo-th-stat">PPG</span>
        <span className="odoo-th odoo-th-stat hide-mobile">RPG</span>
        <span className="odoo-th odoo-th-stat hide-mobile">APG</span>
        <span className="odoo-th odoo-th-arrow"></span>
      </div>

      {/* Team rows */}
      <div className="odoo-table-body">
        {teams.map((team, i) => {
          const total = team.stats.wins + team.stats.losses;
          const winPct = total > 0 ? ((team.stats.wins / total) * 100).toFixed(1) : '0.0';

          return (
            <Link href={`/teams/${team.id}`} key={team.id} className="odoo-team-row">
              {/* Rank */}
              <span className={`odoo-rank ${i === 0 ? 'odoo-rank-1' : i === 1 ? 'odoo-rank-2' : i === 2 ? 'odoo-rank-3' : ''}`}>
                {i + 1}
              </span>

              {/* Team info */}
              <div className="odoo-team-cell">
                <span className="odoo-team-logo" style={{ background: team.colors?.primary || accent }}>
                  {team.shortName}
                </span>
                <div className="odoo-team-info">
                  <span className="odoo-team-name">{team.name}</span>
                  <span className="odoo-team-school">{team.school}</span>
                </div>
              </div>

              {/* Stats */}
              <span className="odoo-td odoo-td-wins">{team.stats.wins}</span>
              <span className="odoo-td odoo-td-losses">{team.stats.losses}</span>
              <span className="odoo-td hide-mobile">{team.stats.gamesPlayed}</span>
              <span className="odoo-td odoo-td-winpct">{winPct}%</span>
              <span className="odoo-td odoo-td-ppg">{team.averages.pointsPerGame}</span>
              <span className="odoo-td hide-mobile">{team.averages.reboundsPerGame}</span>
              <span className="odoo-td hide-mobile">{team.averages.assistsPerGame}</span>

              <span className="odoo-row-arrow">
                <i className="fas fa-chevron-right"></i>
              </span>
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

  const totalW = teams.reduce((s, t) => s + t.stats.wins, 0);
  const totalL = teams.reduce((s, t) => s + t.stats.losses, 0);

  return (
    <main className="main-content">
      {/* Page breadcrumb + header */}
      <div className="odoo-teams-header">
        <div className="odoo-breadcrumb">
          <Link href="/">Нүүр</Link>
          <i className="fas fa-angle-right"></i>
          <span>Багууд</span>
        </div>
        <div className="odoo-teams-title-row">
          <div className="odoo-teams-title-left">
            <h1>Багууд</h1>
            <span className="odoo-teams-badge">SGL 2026</span>
          </div>
          <div className="odoo-teams-summary">
            <div className="odoo-summary-item">
              <span className="odoo-summary-num">{teams.length}</span>
              <span className="odoo-summary-label">Нийт баг</span>
            </div>
            <div className="odoo-summary-divider"></div>
            <div className="odoo-summary-item">
              <span className="odoo-summary-num">{totalW + totalL}</span>
              <span className="odoo-summary-label">Тоглолт</span>
            </div>
            <div className="odoo-summary-divider"></div>
            <div className="odoo-summary-item">
              <span className="odoo-summary-num">{teams.length > 0 ? (teams.reduce((s, t) => s + parseFloat(t.averages.pointsPerGame || '0'), 0) / teams.length).toFixed(1) : '0'}</span>
              <span className="odoo-summary-label">Дундаж оноо</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conference tables */}
      <div className="odoo-conferences">
        <ConferenceTable teams={westTeams} conference="west" />
        <ConferenceTable teams={eastTeams} conference="east" />
      </div>
    </main>
  );
}
