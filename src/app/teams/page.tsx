import Link from 'next/link';
import { getTeamsWithAverages } from '@/lib/database';

export const dynamic = 'force-dynamic';

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
      <div className="teams-page-header">
        <h1><i className="fas fa-users"></i> Багууд</h1>
        <p className="teams-page-subtitle">Sain Girls League 2026 — {teams.length} баг</p>
      </div>

      {/* Two division layout */}
      <div className="divisions-container">
        {/* West Division */}
        <div className="division-block division-west">
          <div className="division-title-bar west">
            <i className="fas fa-shield-alt"></i>
            <h2>Баруун бүс</h2>
            <span className="division-count">{westTeams.length} баг</span>
          </div>
          <div className="division-table-wrapper">
            <table className="division-table">
              <thead>
                <tr>
                  <th className="th-rank">#</th>
                  <th className="th-team">Баг</th>
                  <th className="th-school">Сургууль</th>
                  <th className="th-stat">W</th>
                  <th className="th-stat">L</th>
                  <th className="th-stat">GP</th>
                  <th className="th-stat">PPG</th>
                  <th className="th-stat hide-mobile">PAPG</th>
                </tr>
              </thead>
              <tbody>
                {westTeams.map((team, i) => (
                  <tr key={team.id} className="division-row">
                    <td className="td-rank">{i + 1}</td>
                    <td className="td-team">
                      <Link href={`/teams/${team.id}`} className="team-link">
                        <span
                          className="team-badge"
                          style={{ backgroundColor: team.colors?.primary || '#F15F22' }}
                        >
                          {team.shortName}
                        </span>
                        <span className="team-name-text">{team.name}</span>
                      </Link>
                    </td>
                    <td className="td-school">{team.school}</td>
                    <td className="td-stat wins-col">{team.stats.wins}</td>
                    <td className="td-stat losses-col">{team.stats.losses}</td>
                    <td className="td-stat">{team.stats.gamesPlayed}</td>
                    <td className="td-stat">{team.averages.pointsPerGame}</td>
                    <td className="td-stat hide-mobile">{team.averages.pointsAllowedPerGame}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* East Division */}
        <div className="division-block division-east">
          <div className="division-title-bar east">
            <i className="fas fa-shield-alt"></i>
            <h2>Зүүн бүс</h2>
            <span className="division-count">{eastTeams.length} баг</span>
          </div>
          <div className="division-table-wrapper">
            <table className="division-table">
              <thead>
                <tr>
                  <th className="th-rank">#</th>
                  <th className="th-team">Баг</th>
                  <th className="th-school">Сургууль</th>
                  <th className="th-stat">W</th>
                  <th className="th-stat">L</th>
                  <th className="th-stat">GP</th>
                  <th className="th-stat">PPG</th>
                  <th className="th-stat hide-mobile">PAPG</th>
                </tr>
              </thead>
              <tbody>
                {eastTeams.map((team, i) => (
                  <tr key={team.id} className="division-row">
                    <td className="td-rank">{i + 1}</td>
                    <td className="td-team">
                      <Link href={`/teams/${team.id}`} className="team-link">
                        <span
                          className="team-badge"
                          style={{ backgroundColor: team.colors?.primary || '#0072bc' }}
                        >
                          {team.shortName}
                        </span>
                        <span className="team-name-text">{team.name}</span>
                      </Link>
                    </td>
                    <td className="td-school">{team.school}</td>
                    <td className="td-stat wins-col">{team.stats.wins}</td>
                    <td className="td-stat losses-col">{team.stats.losses}</td>
                    <td className="td-stat">{team.stats.gamesPlayed}</td>
                    <td className="td-stat">{team.averages.pointsPerGame}</td>
                    <td className="td-stat hide-mobile">{team.averages.pointsAllowedPerGame}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
