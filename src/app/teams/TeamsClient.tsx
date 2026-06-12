"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TeamWithAverages } from "@/types";

type Filter = "all" | "west" | "east";

interface RankedTeam extends TeamWithAverages {
  rank: number;
  confLabel: string;
}

function TeamCard({ team }: { team: RankedTeam }) {
  const [flipped, setFlipped] = useState(false);
  const color = team.colors?.primary || "#F15F22";
  const total = team.stats.wins + team.stats.losses;
  const pct = total > 0 ? team.stats.wins / total : 0;

  return (
    <div
      style={{ position: "relative", height: 248, cursor: "pointer" }}
      onClick={() => setFlipped((f) => !f)}
    >
      {/* FRONT */}
      <div className="sgl-card" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1 }}>
        <div
          style={{
            position: "relative",
            height: 74,
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -20,
              top: -30,
              width: 120,
              height: 120,
              border: "18px solid rgba(255,255,255,.13)",
              borderRadius: "50%",
            }}
          />
          {team.logo ? (
            <img
              src={team.logo}
              alt={team.name}
              style={{
                position: "relative",
                zIndex: 2,
                height: 50,
                width: 50,
                objectFit: "contain",
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,.25))",
              }}
            />
          ) : (
            <span
              style={{
                position: "relative",
                fontFamily: "var(--sgl-head)",
                fontSize: 26,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: 1,
                zIndex: 2,
              }}
            >
              {team.shortName}
            </span>
          )}
          <span
            style={{
              position: "relative",
              zIndex: 2,
              background: "rgba(255,255,255,.92)",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 800,
              color,
              letterSpacing: 0.5,
            }}
          >
            {team.confLabel}
          </span>
        </div>
        <div style={{ padding: "15px 18px" }}>
          <div style={{ fontFamily: "var(--sgl-head)", fontSize: 21, fontWeight: 600, lineHeight: 1.05, color: "var(--sgl-ink)" }}>
            {team.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--sgl-muted)", fontWeight: 600, marginTop: 3 }}>
            {team.school}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                <span style={{ color: "#1F9E5A" }}>{team.stats.wins}</span>
                <span style={{ color: "#C7C7CE" }}>-</span>
                <span style={{ color: "#B0B0B8" }}>{team.stats.losses}</span>
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#B0B0B8", marginTop: 3 }}>
                W-L
              </span>
            </div>
            <div style={{ width: 1, height: 30, background: "rgba(23,23,31,.1)" }} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)", marginBottom: 5 }}>
                <span>Хувь</span>
                <span style={{ color: "var(--sgl-ink)" }}>{(pct * 100).toFixed(0)}%</span>
              </span>
              <span style={{ height: 6, borderRadius: 999, background: "rgba(23,23,31,.07)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${pct * 100}%`, background: color }} />
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid rgba(23,23,31,.06)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted-2)" }}>
              #{team.rank} {team.confLabel}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>Эргүүлэх ↻</span>
          </div>
        </div>
      </div>

      {/* BACK */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 22,
          background: color,
          color: "#fff",
          padding: "20px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity: flipped ? 1 : 0,
          pointerEvents: flipped ? "auto" : "none",
          transition: "opacity .35s ease",
          boxShadow: "var(--sgl-shadow-card)",
          zIndex: 2,
        }}
      >
        <div>
          <span style={{ fontFamily: "var(--sgl-head)", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, opacity: 0.85 }}>
            ★ {team.name}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
            {[
              { v: team.averages.pointsPerGame, l: "PPG" },
              { v: team.averages.reboundsPerGame, l: "RPG" },
              { v: team.averages.assistsPerGame, l: "APG" },
            ].map((s) => (
              <div key={s.l} style={{ background: "rgba(255,255,255,.18)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--sgl-head)", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, opacity: 0.85, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            href={`/teams/${team.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", color, fontWeight: 800, fontSize: 13, padding: "10px 16px", borderRadius: 999 }}
          >
            Дэлгэрэнгүй →
          </Link>
          <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>↻ Буцах</span>
        </div>
      </div>
    </div>
  );
}

export default function TeamsClient({ teams }: { teams: TeamWithAverages[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const ranked = useMemo<RankedTeam[]>(() => {
    const rankConf = (conf: "west" | "east", label: string): RankedTeam[] =>
      teams
        .filter((t) => t.conference === conf)
        .sort((a, b) => b.stats.wins - a.stats.wins || a.stats.losses - b.stats.losses)
        .map((t, i) => ({ ...t, rank: i + 1, confLabel: label }));
    return [...rankConf("west", "Баруун"), ...rankConf("east", "Зүүн")];
  }, [teams]);

  const shown = ranked.filter((t) =>
    filter === "all" ? true : t.conference === filter,
  );

  const pills: { key: Filter; label: string }[] = [
    { key: "all", label: "Бүгд" },
    { key: "west", label: "Баруун" },
    { key: "east", label: "Зүүн" },
  ];

  return (
    <main className="main-content">
      {/* HERO */}
      <section className="sgl-hero" style={{ padding: "46px 34px 30px" }}>
        <div
          className="sgl-hero-blob"
          style={{ top: -70, right: -50, width: 300, height: 300, background: "radial-gradient(circle,rgba(32,196,244,.18),transparent 68%)", animation: "sgl-blob 16s ease-in-out infinite" }}
        />
        <div
          className="sgl-hero-blob"
          style={{ bottom: -90, left: "10%", width: 260, height: 260, background: "radial-gradient(circle,rgba(241,95,34,.14),transparent 70%)", animation: "sgl-blob 19s ease-in-out infinite reverse" }}
        />
        <div className="sgl-hero-inner">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              background: "#fff",
              border: "1px solid rgba(241,95,34,.25)",
              padding: "7px 15px",
              borderRadius: 999,
              boxShadow: "0 8px 22px -14px rgba(241,95,34,.6)",
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#F15F22", animation: "sgl-pulse-dot 1.8s infinite" }} />
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#F15F22" }}>
              Sain Girls League 2026
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(34px, 9vw, 60px)" }}>
            Бүх <span style={{ color: "#F15F22" }}>багууд</span>
          </h1>
          <p>2 бүс, {teams.length} баг, нэг зорилго. Картыг дарж дэлгэрэнгүйг хар.</p>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 26 }}>
            <div
              style={{
                display: "flex",
                background: "#fff",
                border: "1px solid rgba(23,23,31,.08)",
                borderRadius: 999,
                padding: 4,
                boxShadow: "0 6px 16px -12px rgba(0,0,0,.4)",
              }}
            >
              {pills.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setFilter(p.key)}
                  style={{
                    fontFamily: "var(--sgl-head)",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: filter === p.key ? "#F15F22" : "transparent",
                    color: filter === p.key ? "#fff" : "var(--sgl-muted-2)",
                    transition: "all .2s ease",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--sgl-muted)" }}>
              {shown.length} баг
            </span>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section style={{ paddingTop: 8 }}>
        <div className="sgl-teams-card-grid">
          {shown.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </section>
    </main>
  );
}
