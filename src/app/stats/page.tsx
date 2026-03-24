"use client";

import { useState, useMemo } from "react";
import {
  useActiveSeason,
  usePlayerAggregates,
  useTeamAggregates,
  useTeams,
  PlayerAggregateDoc,
  TeamAggregateDoc,
  FirestoreTeam,
} from "@/lib/firestore-hooks";

type MainTab = "players" | "teams";

const TOP_N = 5;

function ordinalRank(i: number): string {
  if (i === 0) return "1ST";
  if (i === 1) return "2ND";
  if (i === 2) return "3RD";
  return `${i + 1}TH`;
}

const playerCategories: {
  key: string;
  label: string;
  fullLabel: string;
  getValue: (p: PlayerAggregateDoc) => number;
  format: (v: number) => string;
}[] = [
  {
    key: "pts",
    label: "PTS",
    fullLabel: "ОНОО",
    getValue: (p) => p.points / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "reb",
    label: "REB",
    fullLabel: "САМБАР",
    getValue: (p) => p.totalRebounds / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "ast",
    label: "AST",
    fullLabel: "ДАМЖУУЛАЛТ",
    getValue: (p) => p.assists / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "stl",
    label: "STL",
    fullLabel: "STEAL",
    getValue: (p) => p.steals / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "blk",
    label: "BLK",
    fullLabel: "BLOCK",
    getValue: (p) => p.blocks / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "foul",
    label: "FOUL",
    fullLabel: "ФОУЛ",
    getValue: (p) => p.personalFoulsCommitted / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "3pm",
    label: "3PM",
    fullLabel: "3 ОНОО",
    getValue: (p) => p.threePointFieldGoalsMade / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "ftm",
    label: "FTM",
    fullLabel: "ТОРГУУЛЬ",
    getValue: (p) => p.freeThrowsMade / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "fgpct",
    label: "FG%",
    fullLabel: "ШИДЭЛТ %",
    getValue: (p) =>
      p.fieldGoalsAttempted > 0 ? p.fieldGoalsMade / p.fieldGoalsAttempted : 0,
    format: (v) => (v * 100).toFixed(1) + "%",
  },
  {
    key: "3pct",
    label: "3PT%",
    fullLabel: "3 ОНОО %",
    getValue: (p) =>
      p.threePointFieldGoalsAttempted > 0
        ? p.threePointFieldGoalsMade / p.threePointFieldGoalsAttempted
        : 0,
    format: (v) => (v * 100).toFixed(1) + "%",
  },
  {
    key: "ftpct",
    label: "FT%",
    fullLabel: "ТОРГУУЛЬ %",
    getValue: (p) =>
      p.freeThrowsAttempted > 0 ? p.freeThrowsMade / p.freeThrowsAttempted : 0,
    format: (v) => (v * 100).toFixed(1) + "%",
  },
];

const teamCategories: {
  key: string;
  label: string;
  fullLabel: string;
  getValue: (t: TeamAggregateDoc) => number;
  format: (v: number) => string;
}[] = [
  {
    key: "pts",
    label: "PTS",
    fullLabel: "ОНОО",
    getValue: (t) => t.points / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "reb",
    label: "REB",
    fullLabel: "САМБАР",
    getValue: (t) => t.totalRebounds / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "ast",
    label: "AST",
    fullLabel: "ДАМЖУУЛАЛТ",
    getValue: (t) => t.assists / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "stl",
    label: "STL",
    fullLabel: "STEAL",
    getValue: (t) => t.steals / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "blk",
    label: "BLK",
    fullLabel: "BLOCK",
    getValue: (t) => t.blocks / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
];

export default function StatsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("players");
  const [playerCatKey, setPlayerCatKey] = useState(playerCategories[0].key);
  const [teamCatKey, setTeamCatKey] = useState(teamCategories[0].key);

  const { season, loading: seasonLoading } = useActiveSeason();
  const { aggregates: playerAggs, loading: playerLoading } =
    usePlayerAggregates(season?.id ?? null);
  const { aggregates: teamAggs, loading: teamLoading } = useTeamAggregates(
    season?.id ?? null,
  );
  const { teams, loading: teamsLoading } = useTeams();

  const loading = seasonLoading || playerLoading || teamLoading || teamsLoading;

  const teamMap = useMemo(() => {
    const map = new Map<string, FirestoreTeam>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const categories = mainTab === "players" ? playerCategories : teamCategories;
  const catKey = mainTab === "players" ? playerCatKey : teamCatKey;
  const setCatKey = (key: string) =>
    mainTab === "players" ? setPlayerCatKey(key) : setTeamCatKey(key);
  const activeCat = categories.find((c) => c.key === catKey) ?? categories[0];

  const leaders = useMemo(() => {
    if (mainTab === "players") {
      if (!playerAggs.length) return [];
      const cat =
        playerCategories.find((c) => c.key === playerCatKey) ??
        playerCategories[0];
      return [...playerAggs]
        .sort((a, b) => cat.getValue(b) - cat.getValue(a))
        .slice(0, TOP_N)
        .map((p) => ({
          id: p.playerId,
          name: p.playerName,
          sub: teamMap.get(p.teamId)?.shortName ?? "",
          value: cat.getValue(p),
        }));
    } else {
      if (!teamAggs.length) return [];
      const cat =
        teamCategories.find((c) => c.key === teamCatKey) ?? teamCategories[0];
      return [...teamAggs]
        .sort((a, b) => cat.getValue(b) - cat.getValue(a))
        .slice(0, TOP_N)
        .map((t) => {
          const team = teamMap.get(t.teamId);
          return {
            id: t.teamId,
            name: team?.name ?? t.teamId,
            sub: team?.shortName ?? "",
            value: cat.getValue(t),
          };
        });
    }
  }, [mainTab, playerCatKey, teamCatKey, playerAggs, teamAggs, teamMap]);

  return (
    <main className="main-content stats-page">
      {/* ── Main Tabs: Players / Teams ── */}
      <div className="stats-main-tabs">
        <button
          className={`stats-main-tab${mainTab === "players" ? " active" : ""}`}
          onClick={() => setMainTab("players")}
        >
          ТОГЛОГЧИД
        </button>
        <button
          className={`stats-main-tab${mainTab === "teams" ? " active" : ""}`}
          onClick={() => setMainTab("teams")}
        >
          БАГУУД
        </button>
      </div>

      {/* ── Category Tabs ── */}
      <div className="stats-cat-tabs-wrap">
        <div className="stats-cat-tabs">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className={`stats-cat-tab${catKey === cat.key ? " active" : ""}`}
              onClick={() => setCatKey(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Leaders Panel ── */}
      {loading ? (
        <p className="stats-loading">Уншиж байна...</p>
      ) : (
        <div className="stats-leaders-panel">
          <div className="stats-leaders-header">
            <span className="stats-leaders-title">{activeCat.fullLabel}</span>
            <span className="stats-leaders-subtitle">
              TOP {TOP_N} &bull; PER GAME
            </span>
          </div>

          <div className="stats-leaders-list">
            {leaders.length === 0 ? (
              <p className="stats-empty">Мэдээлэл байхгүй байна</p>
            ) : (
              leaders.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`stats-leader-row${idx === 0 ? " rank-1" : ""}`}
                  onClick={() =>
                    (window.location.href = `/${mainTab === "players" ? "players" : "teams"}/${entry.id}`)
                  }
                >
                  <span className="stats-leader-rank">{ordinalRank(idx)}</span>

                  <div className="stats-leader-info">
                    <span className="stats-leader-name">{entry.name}</span>
                    {entry.sub && (
                      <span className="stats-leader-sub">{entry.sub}</span>
                    )}
                  </div>

                  <div className="stats-leader-scoreboard">
                    <span className="scoreboard-shadow" aria-hidden="true">
                      {activeCat.format(entry.value).replace(/[0-9]/g, "8")}
                    </span>
                    <span className="scoreboard-value">
                      {activeCat.format(entry.value)}
                    </span>
                    <span className="scoreboard-label">{activeCat.label}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}
