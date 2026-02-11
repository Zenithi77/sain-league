import TeamCard from '@/components/TeamCard';
import { TeamWithAverages } from '@/types';

async function getTeams(): Promise<TeamWithAverages[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/teams`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function TeamsPage() {
  const teams = await getTeams();

  return (
    <main className="main-content">
      <div className="page-header">
        <h1><i className="fas fa-users"></i> Багууд</h1>
        <p>Sain Girls League-ийн бүх багууд</p>
      </div>
      <div className="teams-grid" id="teamsGrid">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </main>
  );
}
