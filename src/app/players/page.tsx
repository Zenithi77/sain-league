import PlayerCard from '@/components/PlayerCard';
import { getPlayersWithAverages, getTeamsWithAverages } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const players = getPlayersWithAverages();
  const teams = getTeamsWithAverages();
  
  // Add team names to players
  const playersWithTeams = players.map((player) => {
    const team = teams.find((t) => t.id === player.teamId);
    return { ...player, teamName: team?.name, teamShortName: team?.shortName };
  });

  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1><i className="fas fa-user"></i> Тоглогчид</h1>
        <p>Sain Girls League-ийн бүх тоглогчид — {playersWithTeams.length} тоглогч</p>
      </div>
      <div className="players-grid">
        {playersWithTeams.map((player) => (
          <PlayerCard key={player.id} player={player} teamName={player.teamName} />
        ))}
      </div>
    </main>
  );
}
