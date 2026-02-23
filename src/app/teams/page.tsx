import TeamCard from '@/components/TeamCard';
import { getTeamsWithAverages } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const teams = getTeamsWithAverages();
  const westTeams = teams.filter((t) => t.conference === 'west');
  const eastTeams = teams.filter((t) => t.conference === 'east');

  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1><i className="fas fa-users"></i> Багууд</h1>
        <p>Sain Girls League 2026 — {teams.length} баг</p>
      </div>

      <div className="conference-section">
        <div className="conference-header">
          <h2><i className="fas fa-arrow-left"></i> Баруун бүс</h2>
          <span className="conference-count">{westTeams.length} баг</span>
        </div>
        <div className="teams-grid" id="westTeams">
          {westTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </div>

      <div className="conference-section">
        <div className="conference-header">
          <h2><i className="fas fa-arrow-right"></i> Зүүн бүс</h2>
          <span className="conference-count">{eastTeams.length} баг</span>
        </div>
        <div className="teams-grid" id="eastTeams">
          {eastTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </div>
    </main>
  );
}
