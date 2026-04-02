import { notFound } from "next/navigation";
import TeamDetailClient from "@/components/TeamDetailClient";
import { getTeamById, getTeamGames } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = getTeamById(id);
  if (!team) notFound();

  const { upcoming, recent } = getTeamGames(id);

  return <TeamDetailClient team={team} upcoming={upcoming} recent={recent} />;
}
