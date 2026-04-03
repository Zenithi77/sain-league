import { notFound } from "next/navigation";
import TeamDetailClient from "@/components/TeamDetailClient";
import {
  getTeamByIdFromFirestore,
  getTeamGamesFromFirestore,
} from "@/lib/firestore";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeamByIdFromFirestore(id);
  if (!team) notFound();

  const { upcoming, recent } = await getTeamGamesFromFirestore(id);

  return <TeamDetailClient team={team} upcoming={upcoming} recent={recent} />;
}
