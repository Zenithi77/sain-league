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

type TabType = "players" | "teams";

const TOP_N = 5;

/** Player stat categories with how to extract the value from aggregate data */
const playerCategories: {
  key: string;
  label: string;
  getValue: (p: PlayerAggregateDoc) => number;
  format: (v: number) => string;
}[] = [
  {
    key: "ppg",
    label: "ОНОО",
    getValue: (p) => p.points / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "rpg",
    label: "САМБАР",
    getValue: (p) => p.totalRebounds / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "apg",
    label: "ДАМЖУУЛАЛТ",
    getValue: (p) => p.assists / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "spg",
    label: "STEAL",
    getValue: (p) => p.steals / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "bpg",
    label: "BLOCK",
    getValue: (p) => p.blocks / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "topg",
    label: "АЛДАА",
    getValue: (p) => p.turnovers / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "threepm",
    label: "3 ОНОО (3PM)",
    getValue: (p) => p.threePointFieldGoalsMade / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "ftm",
    label: "ТОРГУУЛЬ (FTM)",
    getValue: (p) => p.freeThrowsMade / (p.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "fgPct",
    label: "ШИДЭЛТ (FG%)",
    getValue: (p) =>
      p.fieldGoalsAttempted > 0 ? p.fieldGoalsMade / p.fieldGoalsAttempted : 0,
    format: (v) => (v * 100).toFixed(1) + "%",
  },
  {
    key: "threePct",
    label: "3 ОНОО (3PT%)",
    getValue: (p) =>
      p.threePointFieldGoalsAttempted > 0
        ? p.threePointFieldGoalsMade / p.threePointFieldGoalsAttempted
        : 0,
    format: (v) => (v * 100).toFixed(1) + "%",
  },
  {
    key: "ftPct",
    label: "ТОРГУУЛЬ (FT%)",
    getValue: (p) =>
      p.freeThrowsAttempted > 0 ? p.freeThrowsMade / p.freeThrowsAttempted : 0,
    format: (v) => (v * 100).toFixed(1) + "%",
  },
];

/** Team stat categories */
const teamCategories: {
  key: string;
  label: string;
  getValue: (t: TeamAggregateDoc) => number;
  format: (v: number) => string;
}[] = [
  {
    key: "ppg",
    label: "ОНОО",
    getValue: (t) => t.points / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "rpg",
    label: "САМБАР",
    getValue: (t) => t.totalRebounds / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "apg",
    label: "ДАМЖУУЛАЛТ",
    getValue: (t) => t.assists / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "spg",
    label: "STEAL",
    getValue: (t) => t.steals / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
  {
    key: "bpg",
    label: "BLOCK",
    getValue: (t) => t.blocks / (t.gamesPlayed || 1),
    format: (v) => v.toFixed(1),
  },
];

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("players");
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

  // Compute player leaders per category
  const playerLeaders = useMemo(() => {
    if (!playerAggs.length) return {};
    const result: Record<
      string,
      {
        playerId: string;
        playerName: string;
        teamId: string;
        value: number;
        gamesPlayed: number;
      }[]
    > = {};

    for (const cat of playerCategories) {
      const sorted = [...playerAggs].sort(
        (a, b) => cat.getValue(b) - cat.getValue(a),
      );
      result[cat.key] = sorted.slice(0, TOP_N).map((p, idx) => ({
        rank: idx + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        value: cat.getValue(p),
        gamesPlayed: p.gamesPlayed,
      }));
    }
    return result;
  }, [playerAggs]);

  // Compute team leaders per category
  const teamLeaders = useMemo(() => {
    if (!teamAggs.length) return {};
    const result: Record<
      string,
      { teamId: string; value: number; gamesPlayed: number }[]
    > = {};

    for (const cat of teamCategories) {
      const sorted = [...teamAggs].sort(
        (a, b) => cat.getValue(b) - cat.getValue(a),
      );
      result[cat.key] = sorted.slice(0, TOP_N).map((t, idx) => ({
        rank: idx + 1,
        teamId: t.teamId,
        value: cat.getValue(t),
        gamesPlayed: t.gamesPlayed,
      }));
    }
    return result;
  }, [teamAggs]);

  return (
    <main className="main-content">
      <div className="page-header">
        <h1>
          <i className="fas fa-chart-bar"></i> Статистик
        </h1>
        <p>Тоглогчид болон багийн эрэмбэ</p>
      </div>

      {/* Player / Team Tabs */}
      <div className="stats-main-tabs">
        <button
          className={`stats-main-tab ${activeTab === "players" ? "active" : ""}`}
          onClick={() => setActiveTab("players")}
        >
          ТОГЛОГЧИД
        </button>
        <button
          className={`stats-main-tab ${activeTab === "teams" ? "active" : ""}`}
          onClick={() => setActiveTab("teams")}
        >
          БАГУУД
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: "40px" }}>Уншиж байна...</p>
      ) : activeTab === "players" ? (
        <div className="leaders-grid">
          {playerCategories.map((cat) => {
            const entries = playerLeaders[cat.key] ?? [];
            if (entries.length === 0) return null;
            return (
              <div className="leaders-card" key={cat.key}>
                <div className="leaders-card-header">
                  <span className="leaders-card-title">{cat.label}</span>
                </div>
                <ul className="leaders-list">
                  {entries.map((entry, idx) => (
                    <li
                      key={entry.playerId}
                      className="leaders-list-item"
                      onClick={() =>
                        (window.location.href = `/players/${entry.playerId}`)
                      }
                    >
                      <span className="leaders-rank">{idx + 1}.</span>
                      <span className="leaders-name">{entry.playerName}</span>
                      <span className="leaders-team">
                        {teamMap.get(entry.teamId)?.shortName ?? ""}
                      </span>
                      <span className="leaders-stat">
                        {cat.format(entry.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="leaders-grid">
          {teamCategories.map((cat) => {
            const entries = teamLeaders[cat.key] ?? [];
            if (entries.length === 0) return null;
            return (
              <div className="leaders-card" key={cat.key}>
                <div className="leaders-card-header">
                  <span className="leaders-card-title">{cat.label}</span>
                </div>
                <ul className="leaders-list">
                  {entries.map((entry, idx) => {
                    const team = teamMap.get(entry.teamId);
                    return (
                      <li
                        key={entry.teamId}
                        className="leaders-list-item"
                        onClick={() =>
                          (window.location.href = `/teams/${entry.teamId}`)
                        }
                      >
                        <span className="leaders-rank">{idx + 1}.</span>
                        <span className="leaders-name">
                          {team?.name ?? entry.teamId}
                        </span>
                        <span className="leaders-team">
                          {team?.shortName ?? ""}
                        </span>
                        <span className="leaders-stat">
                          {cat.format(entry.value)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
