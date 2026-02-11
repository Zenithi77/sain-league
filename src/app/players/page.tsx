import PlayerCard from '@/components/PlayerCard';
import { PlayerWithAverages, TeamWithAverages } from '@/types';

async function getPlayers(): Promise<PlayerWithAverages[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/players`, {
    cache: 'no-store',
  });
  return res.json();
}

async function getTeams(): Promise<TeamWithAverages[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/teams`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function PlayersPage() {
  const [players, teams] = await Promise.all([getPlayers(), getTeams()]);
  
  // Add team names to players
  const playersWithTeams = players.map((player) => {
    const team = teams.find((t) => t.id === player.teamId);
    return { ...player, teamName: team?.name, teamShortName: team?.shortName };
  });

  return (
    <main className="main-content">
      <div className="page-header">
        <h1><i className="fas fa-user"></i> Тоглогчид</h1>
        <p>Sain Girls League-ийн бүх тоглогчид</p>
      </div>
      <div className="players-grid">
        {playersWithTeams.map((player) => (
          <PlayerCard key={player.id} player={player} teamName={player.teamName} />
        ))}
      </div>
    </main>
  );
}
