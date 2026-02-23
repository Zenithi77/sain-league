import GameDetailClient from "@/components/GameDetailClient";

export const dynamic = "force-dynamic";

export default async function GameDetailPage({
  params,
}: {
  params: { gameId: string };
}) {
  return (
    <main className="main-content">
      <GameDetailClient gameId={params.gameId} />
    </main>
  );
}
