import PlayersClient from "./PlayersClient";
import { getPlayersWithAveragesFromFirestore } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await getPlayersWithAveragesFromFirestore();
  return <PlayersClient players={players} />;
}
