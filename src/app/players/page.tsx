import PlayersClient from './PlayersClient';
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

  // Get unique teams for filter
  const uniqueTeams = teams.map(t => ({ id: t.id, name: t.name, shortName: t.shortName }));

  return <PlayersClient players={playersWithTeams} teams={uniqueTeams} />;
}
