"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerWithAverages, Team } from "@/types";

export interface GameLogRow {
  id: string;
  date: string;
  oppShort: string;
  oppColor: string;
  wl: string;
  won: boolean;
  score: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
}

interface Props {
  player: PlayerWithAverages & { team?: Team };
  teammates: { id: string; name: string; number: number }[];
  gameLog: GameLogRow[];
  league: { pts: number; reb: number; ast: number; stl: number };
  ranks: { pts: number; reb: number; ast: number; stl: number };
  totalPlayers: number;
}

const positionFullName: Record<string, string> = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C: "Center",
};

const MN_MONTHS = ["1-р", "2-р", "3-р", "4-р", "5-р", "6-р", "7-р", "8-р", "9-р", "10-р", "11-р", "12-р"];
function shortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${MN_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const STATS = [
  { key: "pts" as const, label: "Оноо", short: "PTS", color: "#F15F22", avgField: "pointsPerGame", totalField: "totalPoints" },
  { key: "reb" as const, label: "Самбар", short: "REB", color: "#20C4F4", avgField: "reboundsPerGame", totalField: "totalRebounds" },
  { key: "ast" as const, label: "Дамжуулалт", short: "AST", color: "#0072BC", avgField: "assistsPerGame", totalField: "totalAssists" },
  { key: "stl" as const, label: "Таслалт", short: "STL", color: "#1F9E5A", avgField: "stealsPerGame", totalField: "totalSteals" },
] as const;

export default function PlayerDetailClient({
  player,
  teammates,
  gameLog,
  league,
  ranks,
  totalPlayers,
}: Props) {
  const [mode, setMode] = useState<"per" | "tot">("per");

  const color = player.team?.colors?.primary || "#F15F22";
  const color2 = player.team?.colors?.secondary || "#0072BC";
  const teamName = player.team?.name || player.teamName || "—";
  const isStar = ranks.pts > 0 && ranks.pts <= 3;

  const heroStats = STATS.map((s) => ({
    short: s.short,
    val: parseFloat(String(player.averages[s.avgField] || "0")).toFixed(1),
  }));

  return (
    <main className="main-content" style={{ paddingTop: 0 }}>
      {/* BREADCRUMB */}
      <div
        style={{
          padding: "16px 0 0",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--sgl-muted)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexWrap: "wrap",
        }}
      >
        <Link href="/players" style={{ color: "var(--sgl-muted)" }}>Тоглогчид</Link>
        <span>/</span>
        {player.team && (
          <>
            <Link href={`/teams/${player.team.id}`} style={{ color: "var(--sgl-muted)" }}>{teamName}</Link>
            <span>/</span>
          </>
        )}
        <span style={{ color: "var(--sgl-ink)" }}>{player.name}</span>
      </div>

      {/* HERO */}
      <section style={{ paddingTop: 14 }}>
        <div
          className="sgl-reveal"
          style={{
            position: "relative",
            borderRadius: 26,
            overflow: "hidden",
            background: `linear-gradient(120deg, ${color}, ${color2})`,
            color: "#fff",
            padding: "30px 34px",
          }}
        >
          <div style={{ position: "absolute", right: -30, top: -50, width: 230, height: 230, border: "32px solid rgba(255,255,255,.1)", borderRadius: "50%" }} />
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
            {/* photo */}
            <div
              style={{
                position: "relative",
                width: 120,
                height: 140,
                borderRadius: 20,
                background: "rgba(255,255,255,.14)",
                border: "2px solid rgba(255,255,255,.32)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                overflow: "hidden",
                flex: "none",
              }}
            >
              {player.image ? (
                <img src={player.image} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ position: "absolute", top: 10, left: 12, fontFamily: "var(--sgl-head)", fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
                  {player.number}
                </span>
              )}
            </div>

            {/* identity */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 11 }}>
                <span style={{ background: "rgba(255,255,255,.18)", padding: "5px 13px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                  {player.position} · {player.teamShortName || player.team?.shortName || ""}
                </span>
                {player.height && (
                  <span style={{ background: "rgba(255,255,255,.18)", padding: "5px 13px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                    {player.height}
                  </span>
                )}
                {isStar && (
                  <span style={{ background: "#fff", color, padding: "5px 13px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                    ★ Од
                  </span>
                )}
              </div>
              <h1 style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 50, lineHeight: 0.96, letterSpacing: 0.5 }}>
                {player.name}
              </h1>
              {player.team && (
                <Link href={`/teams/${player.team.id}`} style={{ fontSize: 14, fontWeight: 700, opacity: 0.92, marginTop: 7, display: "inline-flex", alignItems: "center", gap: 7 }}>
                  {teamName} →
                </Link>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginTop: 6 }}>
                {positionFullName[player.position] || player.position}
              </div>
            </div>

            {/* hero stat tiles */}
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {heroStats.map((h) => (
                <div key={h.short} style={{ background: "rgba(255,255,255,.15)", borderRadius: 16, padding: "14px 16px", textAlign: "center", minWidth: 70 }}>
                  <div style={{ fontFamily: "var(--sgl-head)", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{h.val}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, opacity: 0.85, marginTop: 4 }}>{h.short}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MODE TOGGLE */}
      <section style={{ paddingTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, color: "var(--sgl-ink)" }}>
            Улирлын статистик
          </h2>
          <div style={{ display: "flex", gap: 5, background: "#fff", border: "1px solid var(--sgl-line)", borderRadius: 999, padding: 5, boxShadow: "0 6px 16px -12px rgba(0,0,0,.4)" }}>
            {([["per", "Тоглолт тутамд"], ["tot", "Нийт"]] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: mode === m ? "var(--sgl-orange)" : "transparent",
                  color: mode === m ? "#fff" : "var(--sgl-muted-2)",
                  transition: "all .2s ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STAT TILES */}
      <section style={{ paddingTop: 12 }}>
        <div className="sgl-pd-tiles">
          {STATS.map((s) => {
            const value =
              mode === "per"
                ? parseFloat(String(player.averages[s.avgField] || "0")).toFixed(1)
                : String(player.stats[s.totalField] ?? 0);
            const rank = ranks[s.key];
            return (
              <div
                key={s.key}
                className="sgl-reveal"
                style={{ position: "relative", background: "#fff", borderRadius: 20, padding: 20, border: "1px solid var(--sgl-line-2)", boxShadow: "var(--sgl-shadow-card)", overflow: "hidden" }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: s.color }} />
                <div style={{ fontFamily: "var(--sgl-head)", fontSize: 40, fontWeight: 700, lineHeight: 1, color: s.color }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--sgl-muted)", fontWeight: 700, marginTop: 6 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#B0B0B8", fontWeight: 600, marginTop: 10 }}>
                  Лигт <span style={{ color: "var(--sgl-ink)", fontWeight: 800 }}>#{rank}/{totalPlayers}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPARE + GAME LOG */}
      <section style={{ paddingTop: 18 }}>
        <div className="sgl-pd-grid">
          {/* vs league */}
          <div className="sgl-card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "var(--sgl-head)", fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--sgl-ink)" }}>
              Лигийн дундажтай харьцуулсан нь
            </h3>
            <p style={{ fontSize: 12, color: "var(--sgl-muted)", fontWeight: 600, marginBottom: 18 }}>
              Энэ тоглогч лигийн дундажаас хэр давсныг харуул.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {STATS.map((s) => {
                const v = parseFloat(String(player.averages[s.avgField] || "0"));
                const avg = league[s.key];
                const denom = Math.max(avg * 2, v, 1);
                const barW = Math.max(4, Math.min(100, (v / denom) * 100));
                const avgMark = Math.min(100, (avg / denom) * 100);
                return (
                  <div key={s.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                      <span style={{ color: "var(--sgl-muted-2)" }}>{s.label}</span>
                      <span style={{ fontFamily: "var(--sgl-head)", color: s.color }}>
                        {v.toFixed(1)} <span style={{ color: "#C0C0C8", fontSize: 11, fontWeight: 600 }}>/ {avg.toFixed(1)} дундаж</span>
                      </span>
                    </div>
                    <div style={{ position: "relative", height: 10, borderRadius: 999, background: "rgba(23,23,31,.06)", overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${barW}%`, background: s.color, transition: "width 1s cubic-bezier(.2,.7,.2,1)" }} />
                      <span style={{ position: "absolute", top: -3, bottom: -3, width: 2, background: "#17171F", left: `${avgMark}%`, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* shooting % */}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--sgl-line)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                { l: "FG%", v: player.averages.fieldGoalPercentage },
                { l: "3PT%", v: player.averages.threePointPercentage },
                { l: "FT%", v: player.averages.freeThrowPercentage },
              ].map((x) => (
                <div key={x.l} style={{ background: "var(--sgl-bg)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--sgl-head)", fontSize: 20, fontWeight: 700, color: "var(--sgl-ink)" }}>{x.v}%</div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "var(--sgl-muted)", marginTop: 3 }}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)" }}>
              <span style={{ width: 14, height: 3, background: "#17171F", borderRadius: 2, display: "inline-block" }} />
              Лигийн дундаж
            </div>
          </div>

          {/* game log */}
          <div className="sgl-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 6px" }}>
              <h3 style={{ fontFamily: "var(--sgl-head)", fontSize: 18, fontWeight: 700, color: "var(--sgl-ink)" }}>Сүүлийн тоглолтууд</h3>
            </div>
            <div className="sgl-glog" style={{ fontFamily: "var(--sgl-head)", fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: "var(--sgl-muted)", textTransform: "uppercase" }}>
              <span>Огноо</span>
              <span>Өрсөлдөгч</span>
              <span style={{ textAlign: "center" }}>PTS</span>
              <span style={{ textAlign: "center" }}>REB</span>
              <span style={{ textAlign: "center" }}>AST</span>
              <span style={{ textAlign: "center" }}>STL</span>
            </div>
            {gameLog.length === 0 ? (
              <div style={{ padding: "32px 22px", textAlign: "center", color: "var(--sgl-muted)", fontWeight: 600, fontSize: 14 }}>
                Тоглолтын мэдээлэл байхгүй
              </div>
            ) : (
              gameLog.map((g) => (
                <Link key={g.id} href={`/game/${g.id}`} className="sgl-glog sgl-glog-row">
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)" }}>{shortDate(g.date)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: g.won ? "#1F9E5A" : "#C76B6B", width: 14 }}>{g.wl}</span>
                    <span style={{ width: 24, height: 24, borderRadius: 7, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: g.oppColor, fontFamily: "var(--sgl-head)", fontSize: 8, fontWeight: 700, color: "#fff" }}>
                      {g.oppShort.charAt(0)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.score}</span>
                  </span>
                  <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 15, color }}>{g.pts}</span>
                  <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 600, fontSize: 15, color: "var(--sgl-muted-2)" }}>{g.reb}</span>
                  <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 600, fontSize: 15, color: "var(--sgl-muted-2)" }}>{g.ast}</span>
                  <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 600, fontSize: 15, color: "var(--sgl-muted-2)" }}>{g.stl}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* TEAMMATES */}
      {teammates.length > 0 && (
        <section style={{ paddingTop: 6, paddingBottom: 10 }}>
          <div style={{ fontFamily: "var(--sgl-head)", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "var(--sgl-muted)", textTransform: "uppercase", marginBottom: 12 }}>
            Багийн хамтрагчид
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {teammates.map((m) => (
              <Link
                key={m.id}
                href={`/players/${m.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "1px solid var(--sgl-line)",
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--sgl-ink)",
                  boxShadow: "0 6px 16px -14px rgba(0,0,0,.4)",
                }}
              >
                <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, color }}>{m.number}</span> {m.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* BACK */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "16px 0 0" }}>
        <Link href="/players" className="sgl-btn sgl-btn-ghost" style={{ fontSize: 14, padding: "12px 22px" }}>
          ← Бүх тоглогчид
        </Link>
        {player.team && (
          <Link href={`/teams/${player.team.id}`} className="sgl-btn sgl-btn-ghost" style={{ fontSize: 14, padding: "12px 22px" }}>
            {teamName}
          </Link>
        )}
      </div>
    </main>
  );
}
