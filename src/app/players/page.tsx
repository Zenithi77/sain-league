import PlayersClient from "./PlayersClient";
import { getPlayersWithAveragesFromFirestore, getTeams } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const [players, teams] = await Promise.all([
    getPlayersWithAveragesFromFirestore(),
    getTeams(),
  ]);

  // Get unique teams for filter
  const uniqueTeams = teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
  }));

  return <PlayersClient players={players} teams={uniqueTeams} />;
}
