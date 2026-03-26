import { notFound } from "next/navigation";
import TeamDetailClient from "@/components/TeamDetailClient";
import { getTeamById, getTeamGames } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const team = getTeamById(params.id);
  if (!team) notFound();

  const { upcoming, recent } = getTeamGames(params.id);

  return <TeamDetailClient team={team} upcoming={upcoming} recent={recent} />;
}