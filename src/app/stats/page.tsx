"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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

const CAT_COLORS: Record<string, string> = {
  pts: "#F15F22",
  reb: "#20C4F4",
  ast: "#0072BC",
  stl: "#1F9E5A",
  blk: "#9B5DE5",
  foul: "#E53946",
  "3pm": "#E0A800",
  ftm: "#0072BC",
  fgpct: "#F15F22",
  "3pct": "#20C4F4",
  ftpct: "#1F9E5A",
};

interface Cat {
  key: string;
  label: string;
  fullLabel: string;
  // accepts a player or team aggregate doc (fields vary by mode)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValue: (p: any) => number;
  format: (v: number) => string;
}

const playerCategories: Cat[] = [
  { key: "pts", label: "PTS", fullLabel: "ОНОО", getValue: (p) => p.points / (p.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "reb", label: "REB", fullLabel: "САМБАР", getValue: (p) => p.totalRebounds / (p.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "ast", label: "AST", fullLabel: "ДАМЖУУЛАЛТ", getValue: (p) => p.assists / (p.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "stl", label: "STL", fullLabel: "ТАСЛАЛТ", getValue: (p) => p.steals / (p.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "blk", label: "BLK", fullLabel: "ХААЛТ", getValue: (p) => p.blocks / (p.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "3pm", label: "3PM", fullLabel: "3 ОНОО", getValue: (p) => p.threePointFieldGoalsMade / (p.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "ftm", label: "FTM", fullLabel: "ТОРГУУЛЬ", getValue: (p) => p.freeThrowsMade / (p.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "fgpct", label: "FG%", fullLabel: "ШИДЭЛТ %", getValue: (p) => (p.fieldGoalsAttempted > 0 ? p.fieldGoalsMade / p.fieldGoalsAttempted : 0), format: (v) => (v * 100).toFixed(1) + "%" },
  { key: "3pct", label: "3PT%", fullLabel: "3 ОНОО %", getValue: (p) => (p.threePointFieldGoalsAttempted > 0 ? p.threePointFieldGoalsMade / p.threePointFieldGoalsAttempted : 0), format: (v) => (v * 100).toFixed(1) + "%" },
  { key: "ftpct", label: "FT%", fullLabel: "ТОРГУУЛЬ %", getValue: (p) => (p.freeThrowsAttempted > 0 ? p.freeThrowsMade / p.freeThrowsAttempted : 0), format: (v) => (v * 100).toFixed(1) + "%" },
];

const teamCategories: Cat[] = [
  { key: "pts", label: "PTS", fullLabel: "ОНОО", getValue: (t) => t.points / (t.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "reb", label: "REB", fullLabel: "САМБАР", getValue: (t) => t.totalRebounds / (t.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "ast", label: "AST", fullLabel: "ДАМЖУУЛАЛТ", getValue: (t) => t.assists / (t.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "stl", label: "STL", fullLabel: "ТАСЛАЛТ", getValue: (t) => t.steals / (t.gamesPlayed || 1), format: (v) => v.toFixed(1) },
  { key: "blk", label: "BLK", fullLabel: "ХААЛТ", getValue: (t) => t.blocks / (t.gamesPlayed || 1), format: (v) => v.toFixed(1) },
];

interface Entry {
  id: string;
  name: string;
  sub: string;
  teamColor: string;
  value: number;
}

export default function StatsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("players");
  const [playerCatKey, setPlayerCatKey] = useState(playerCategories[0].key);
  const [teamCatKey, setTeamCatKey] = useState(teamCategories[0].key);

  const { season } = useActiveSeason();
  const { aggregates: playerAggs, loading: playerLoading } = usePlayerAggregates(season?.id ?? null);
  const { aggregates: teamAggs, loading: teamLoading } = useTeamAggregates(season?.id ?? null);
  const { teams, loading: teamsLoading } = useTeams();

  const loading = playerLoading || teamLoading || teamsLoading;

  const teamMap = useMemo(() => {
    const map = new Map<string, FirestoreTeam>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const categories = mainTab === "players" ? playerCategories : teamCategories;
  const catKey = mainTab === "players" ? playerCatKey : teamCatKey;
  const setCatKey = (key: string) => (mainTab === "players" ? setPlayerCatKey(key) : setTeamCatKey(key));
  const activeCat = categories.find((c) => c.key === catKey) ?? categories[0];
  const catColor = CAT_COLORS[activeCat.key] || "#F15F22";

  const entries = useMemo<Entry[]>(() => {
    if (mainTab === "players") {
      const cat = playerCategories.find((c) => c.key === playerCatKey) ?? playerCategories[0];
      return [...playerAggs]
        .filter((p) => p.gamesPlayed > 0)
        .map((p) => ({
          id: p.playerId,
          name: p.playerName,
          sub: teamMap.get(p.teamId)?.shortName ?? "",
          teamColor: teamMap.get(p.teamId)?.colors?.primary ?? "#F15F22",
          value: cat.getValue(p),
        }))
        .sort((a, b) => b.value - a.value);
    }
    const cat = teamCategories.find((c) => c.key === teamCatKey) ?? teamCategories[0];
    return [...teamAggs]
      .filter((t) => t.gamesPlayed > 0)
      .map((t) => {
        const team = teamMap.get(t.teamId);
        return {
          id: t.teamId,
          name: team?.name ?? t.teamId,
          sub: team?.shortName ?? "",
          teamColor: team?.colors?.primary ?? "#F15F22",
          value: cat.getValue(t),
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [mainTab, playerCatKey, teamCatKey, playerAggs, teamAggs, teamMap]);

  const board = entries.slice(0, 10);
  const leader = board[0];
  const maxVal = board.length ? board[0].value : 1;
  const basePath = mainTab === "players" ? "/players" : "/teams";

  const snapshot = useMemo(() => {
    if (!entries.length) return null;
    const vals = entries.map((e) => e.value);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const high = Math.max(...vals);
    const low = Math.min(...vals);
    return { avg, high, low };
  }, [entries]);

  return (
    <main style={{ paddingTop: 24, paddingBottom: 8 }}>
      {/* HERO */}
      <section className="sgl-hero" style={{ padding: "44px 34px 24px" }}>
        <div className="sgl-hero-blob" style={{ top: -70, left: -40, width: 300, height: 300, background: "radial-gradient(circle,rgba(241,95,34,.15),transparent 68%)", animation: "sgl-blob 16s ease-in-out infinite" }} />
        <div className="sgl-hero-inner" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 18 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid rgba(241,95,34,.25)", padding: "7px 15px", borderRadius: 999, boxShadow: "0 8px 22px -14px rgba(241,95,34,.6)" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#F15F22", animation: "sgl-pulse-dot 1.8s infinite" }} />
              <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#F15F22" }}>
                {season?.year ?? 2026} оны улирал
              </span>
            </div>
            <h1 style={{ fontSize: 60, marginTop: 12 }}>СТАТИСТИК</h1>
            <p>Лигийн тэргүүлэгчид бүх ангиллаар. Тоглогч болон багуудын үзүүлэлтийг харьцуул.</p>
          </div>
          <div style={{ display: "flex", background: "#17171F", borderRadius: 999, padding: 5, boxShadow: "0 12px 30px -16px rgba(0,0,0,.6)" }}>
            {([["players", "Тоглогчид"], ["teams", "Багууд"]] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMainTab(m)}
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  padding: "10px 22px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: mainTab === m ? "#F15F22" : "transparent",
                  color: mainTab === m ? "#fff" : "#9A9AA4",
                  transition: "all .2s ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORY RAIL */}
      <section className="sgl-section" style={{ paddingTop: 14, paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 9, overflowX: "auto", padding: "4px 0 8px" }} className="sgl-noscroll">
          {categories.map((c) => {
            const active = c.key === catKey;
            const cc = CAT_COLORS[c.key] || "#F15F22";
            return (
              <button
                key={c.key}
                onClick={() => setCatKey(c.key)}
                style={{
                  flex: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "10px 18px",
                  borderRadius: 14,
                  border: `1.5px solid ${active ? cc : "rgba(23,23,31,.08)"}`,
                  background: active ? cc : "#fff",
                  color: active ? "#fff" : "var(--sgl-muted-2)",
                  cursor: "pointer",
                  transition: "all .2s ease",
                }}
              >
                <span style={{ fontFamily: "var(--sgl-head)", fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, opacity: 0.8 }}>{c.fullLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <p style={{ textAlign: "center", padding: 60, color: "var(--sgl-muted)" }}>Уншиж байна...</p>
      ) : !leader ? (
        <p style={{ textAlign: "center", padding: 60, color: "var(--sgl-muted)" }}>Мэдээлэл байхгүй байна</p>
      ) : (
        <>
          {/* SCOREBOARD + LEADERBOARD */}
          <section className="sgl-section" style={{ paddingTop: 10, paddingBottom: 16 }}>
            <div className="sgl-stats-grid">
              {/* leader scoreboard */}
              <Link
                href={`${basePath}/${leader.id}`}
                className="sgl-reveal"
                style={{ position: "relative", borderRadius: 26, overflow: "hidden", background: "#17171F", color: "#fff", padding: "28px 30px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 330, boxShadow: "0 26px 56px -32px rgba(0,0,0,.7)" }}
              >
                <div style={{ position: "absolute", right: -40, top: -50, width: 230, height: 230, border: `30px solid ${catColor}`, borderRadius: "50%", opacity: 0.25 }} />
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: catColor }} />
                <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: catColor, color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 1, padding: "6px 13px", borderRadius: 999 }}>
                    ★ Лигийн тэргүүн
                  </span>
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 13, fontWeight: 600, letterSpacing: 1, color: "#7A7A86" }}>
                    {activeCat.label} · тоглолт тутамд
                  </span>
                </div>
                <div className="sgl-stats-hero-flex" style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, margin: "10px 0" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--sgl-head)", fontSize: 13, fontWeight: 600, letterSpacing: 1, color: catColor, marginBottom: 6 }}>#1</div>
                    <div style={{ fontFamily: "var(--sgl-head)", fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{leader.name}</div>
                    {leader.sub && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, background: "rgba(255,255,255,.08)", padding: "6px 13px", borderRadius: 999 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: leader.teamColor }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#C9C9D0" }}>{leader.sub}</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 130, fontWeight: 700, lineHeight: 0.8, color: catColor, letterSpacing: -2, flex: "none", textAlign: "right" }}>
                    {activeCat.format(leader.value)}
                  </span>
                </div>
                <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#9A9AA4" }}>
                  <span>Профайл харах</span>
                  <span style={{ color: catColor }}>→</span>
                </div>
              </Link>

              {/* ranked leaderboard */}
              <div className="sgl-card sgl-reveal" style={{ overflow: "hidden", borderRadius: 26 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 12px" }}>
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 17, fontWeight: 700, color: "var(--sgl-ink)" }}>{activeCat.fullLabel}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--sgl-muted)" }}>TOP 10 · тоглолт тутамд</span>
                </div>
                <div style={{ padding: "0 0 8px" }}>
                  {board.map((r, i) => {
                    const rankColor = i === 0 ? catColor : i < 3 ? "#0072BC" : "var(--sgl-muted)";
                    return (
                      <Link key={r.id} href={`${basePath}/${r.id}`} className="sgl-stats-row">
                        <span style={{ fontFamily: "var(--sgl-head)", fontSize: 16, fontWeight: 700, color: rankColor }}>{i + 1}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.teamColor, flex: "none" }} />
                            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--sgl-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sgl-muted)", flex: "none" }}>{r.sub}</span>
                          </div>
                          <span style={{ display: "block", height: 6, borderRadius: 999, background: "rgba(23,23,31,.06)", overflow: "hidden" }}>
                            <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${maxVal ? (r.value / maxVal) * 100 : 0}%`, background: catColor, transition: "width .9s cubic-bezier(.2,.7,.2,1)" }} />
                          </span>
                        </div>
                        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 24, fontWeight: 700, textAlign: "right", color: "var(--sgl-ink)" }}>
                          {activeCat.format(r.value)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* LEAGUE SNAPSHOT */}
          {snapshot && (
            <section className="sgl-section" style={{ paddingTop: 10, paddingBottom: 20 }}>
              <div style={{ fontFamily: "var(--sgl-head)", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "var(--sgl-muted)", textTransform: "uppercase", marginBottom: 12 }}>
                Лигийн зураглал · {activeCat.fullLabel}
              </div>
              <div className="sgl-snap-grid">
                {[
                  { label: "Дундаж", value: snapshot.avg, sub: mainTab === "players" ? "бүх тоглогчийн дундаж" : "бүх багийн дундаж", color: "#0072BC" },
                  { label: "Дээд", value: snapshot.high, sub: "хамгийн өндөр үзүүлэлт", color: "#1F9E5A" },
                  { label: "Доод", value: snapshot.low, sub: "хамгийн бага үзүүлэлт", color: "#E53946" },
                ].map((s) => (
                  <div key={s.label} className="sgl-reveal" style={{ position: "relative", background: "#fff", borderRadius: 20, padding: 22, border: "1px solid var(--sgl-line-2)", boxShadow: "var(--sgl-shadow-card)", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: s.color }} />
                    <div style={{ fontSize: 12, color: "var(--sgl-muted)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 42, fontWeight: 700, lineHeight: 1, color: s.color, marginTop: 8 }}>{activeCat.format(s.value)}</div>
                    <div style={{ fontSize: 12, color: "var(--sgl-muted-3)", fontWeight: 600, marginTop: 8 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
