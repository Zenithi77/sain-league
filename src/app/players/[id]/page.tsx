import { notFound } from "next/navigation";
import {
  getPlayerByIdFromFirestore,
  getPlayersWithAveragesFromFirestore,
  getGamesWithTeamsFromFirestore,
} from "@/lib/firestore";
import PlayerDetailClient, { GameLogRow } from "./PlayerDetailClient";

export const dynamic = "force-dynamic";

const num = (s: string | number | undefined) => {
  const n = parseFloat(String(s ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [player, allPlayers, games] = await Promise.all([
    getPlayerByIdFromFirestore(id),
    getPlayersWithAveragesFromFirestore(),
    getGamesWithTeamsFromFirestore(),
  ]);

  if (!player) notFound();

  // ---- Teammates (same team, excluding self) ----
  const teammates = allPlayers
    .filter((p) => p.teamId === player.teamId && p.id !== player.id)
    .sort((a, b) => a.number - b.number)
    .map((p) => ({ id: p.id, name: p.name, number: p.number }));

  // ---- League averages (mean of per-game averages, players who played) ----
  const played = allPlayers.filter((p) => p.stats.gamesPlayed > 0);
  const mean = (sel: (p: (typeof allPlayers)[number]) => number) =>
    played.length ? played.reduce((s, p) => s + sel(p), 0) / played.length : 0;
  const league = {
    pts: mean((p) => num(p.averages.pointsPerGame)),
    reb: mean((p) => num(p.averages.reboundsPerGame)),
    ast: mean((p) => num(p.averages.assistsPerGame)),
    stl: mean((p) => num(p.averages.stealsPerGame)),
  };

  // ---- League ranks for this player ----
  const rankOf = (sel: (p: (typeof allPlayers)[number]) => number) => {
    const sorted = [...allPlayers].sort((a, b) => sel(b) - sel(a));
    return sorted.findIndex((p) => p.id === player.id) + 1;
  };
  const ranks = {
    pts: rankOf((p) => num(p.averages.pointsPerGame)),
    reb: rankOf((p) => num(p.averages.reboundsPerGame)),
    ast: rankOf((p) => num(p.averages.assistsPerGame)),
    stl: rankOf((p) => num(p.averages.stealsPerGame)),
  };

  // ---- Game log (finished games where this player has a stat line) ----
  const gameLog: GameLogRow[] = games
    .filter(
      (g) =>
        g.status === "finished" &&
        (g.playerStats || []).some((s) => s.playerId === player.id),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map((g) => {
      const line = (g.playerStats || []).find((s) => s.playerId === player.id)!;
      const isHome = g.homeTeamId === player.teamId;
      const opp = isHome ? g.awayTeam : g.homeTeam;
      const myScore = isHome ? g.homeScore : g.awayScore;
      const oppScore = isHome ? g.awayScore : g.homeScore;
      const won = myScore > oppScore;
      return {
        id: g.id,
        date: g.date,
        oppShort: opp?.shortName || "TBD",
        oppColor: opp?.colors?.primary || "#9A9AA4",
        wl: won ? "Х" : "Я",
        won,
        score: `${myScore}-${oppScore}`,
        pts: line.points ?? 0,
        reb: line.rebounds ?? 0,
        ast: line.assists ?? 0,
        stl: line.steals ?? 0,
      };
    });

  return (
    <PlayerDetailClient
      player={player}
      teammates={teammates}
      gameLog={gameLog}
      league={league}
      ranks={ranks}
      totalPlayers={allPlayers.length}
    />
  );
}
