import TeamCard from '@/components/TeamCard';
import { getTeamsWithAverages } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const teams = getTeamsWithAverages();

  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1><i className="fas fa-users"></i> Багууд</h1>
        <p>Sain Girls League-ийн бүх багууд — {teams.length} баг</p>
      </div>
      <div className="teams-grid" id="teamsGrid">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </main>
  );
}
