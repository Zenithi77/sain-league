import { getTeamsWithAveragesFromFirestore } from "@/lib/firestore";
import TeamsClient from "./TeamsClient";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await getTeamsWithAveragesFromFirestore();
  return <TeamsClient teams={teams} />;
}
