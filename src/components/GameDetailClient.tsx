"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  useActiveSeason,
  useTeams,
  useBoxscores,
  BoxscoreEntry,
  FirestoreTeam,
  FirestoreGame,
} from "@/lib/firestore-hooks";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface GameDetailProps {
  gameId: string;
}

const MN_WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const MN_MONTHS = ["1 сар", "2 сар", "3 сар", "4 сар", "5 сар", "6 сар", "7 сар", "8 сар", "9 сар", "10 сар", "11 сар", "12 сар"];

function formatFullDate(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  return `${MN_WEEKDAYS[d.getDay()]}, ${MN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface TeamTotals {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  turnovers: number;
  fgMade: number;
  fgAttempted: number;
  threeMade: number;
  threeAttempted: number;
  ftMade: number;
  ftAttempted: number;
}

function calcTotals(entries: BoxscoreEntry[]): TeamTotals {
  return entries.reduce(
    (acc, ps) => ({
      points: acc.points + ps.points,
      rebounds: acc.rebounds + ps.rebounds,
      assists: acc.assists + ps.assists,
      steals: acc.steals + ps.steals,
      turnovers: acc.turnovers + ps.turnovers,
      fgMade: acc.fgMade + ps.fgMade,
      fgAttempted: acc.fgAttempted + ps.fgAttempted,
      threeMade: acc.threeMade + ps.threeMade,
      threeAttempted: acc.threeAttempted + ps.threeAttempted,
      ftMade: acc.ftMade + ps.ftMade,
      ftAttempted: acc.ftAttempted + ps.ftAttempted,
    }),
    {
      points: 0, rebounds: 0, assists: 0, steals: 0, turnovers: 0,
      fgMade: 0, fgAttempted: 0, threeMade: 0, threeAttempted: 0,
      ftMade: 0, ftAttempted: 0,
    },
  );
}

function pct(made: number, att: number): number {
  return att > 0 ? (made / att) * 100 : 0;
}

/* ── Top performers card (one team) ─────────────────────────────────── */
function PerformersCard({
  team,
  entries,
  fallbackColor,
}: {
  team: FirestoreTeam | null;
  entries: BoxscoreEntry[];
  fallbackColor: string;
}) {
  const color = team?.colors?.primary || fallbackColor;
  const soft = `${color}1A`;
  const top = [...entries].sort((a, b) => b.points - a.points).slice(0, 3);

  if (top.length === 0) return null;

  return (
    <div className="sgl-card sgl-reveal" style={{ overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", background: soft, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: color, fontFamily: "var(--sgl-head)", fontSize: 9, fontWeight: 700, color: "#fff" }}>
          {team?.shortName?.charAt(0) || "?"}
        </span>
        <span style={{ fontFamily: "var(--sgl-head)", fontSize: 15, fontWeight: 700, color: "var(--sgl-ink)" }}>
          {team?.name || "Баг"}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)", marginLeft: "auto" }}>
          Шилдгүүд
        </span>
      </div>
      <div style={{ padding: "6px 0" }}>
        {top.map((pl) => (
          <Link
            key={pl.id}
            href={`/players/${pl.id}`}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px" }}
            className="sgl-gd-prow"
          >
            <span style={{ width: 34, height: 34, borderRadius: 10, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: soft, color, fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 700 }}>
              {pl.jerseyNumber || pl.playerName?.charAt(0) || "?"}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, color: "var(--sgl-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pl.playerName || "Unknown"}
            </span>
            <span style={{ display: "flex", gap: 13 }}>
              {[
                { v: pl.points, l: "PTS", c: color },
                { v: pl.rebounds, l: "REB", c: "var(--sgl-ink)" },
                { v: pl.assists, l: "AST", c: "var(--sgl-ink)" },
              ].map((s) => (
                <span key={s.l} style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 15, color: s.c }}>{s.v}</span>
                  <span style={{ display: "block", fontSize: 8, fontWeight: 700, color: "#C0C0C8" }}>{s.l}</span>
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function GameDetailClient({ gameId }: GameDetailProps) {
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { teams: firestoreTeams, loading: teamsLoading } = useTeams();
  const { boxscores, loading: boxLoading } = useBoxscores(seasonId, gameId);
  const [game, setGame] = useState<(FirestoreGame & { location?: string | null }) | null>(null);
  const [gameLoading, setGameLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) return;
    setGameLoading(true);
    const ref = doc(db, `seasons/${seasonId}/games/${gameId}`);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setGame({ id: snap.id, ...snap.data() } as FirestoreGame & { location?: string | null });
        }
        setGameLoading(false);
      })
      .catch((err) => {
        console.error("[GameDetailClient] fetch game", err);
        setGameLoading(false);
      });
  }, [seasonId, gameId]);

  const loading = seasonLoading || teamsLoading || boxLoading || gameLoading;

  const teamMap = useMemo(() => {
    const map = new Map<string, FirestoreTeam>();
    firestoreTeams.forEach((t) => map.set(t.id, t));
    return map;
  }, [firestoreTeams]);

  if (loading) {
    return (
      <p style={{ textAlign: "center", padding: 60, color: "var(--sgl-muted)" }}>
        Ачаалж байна...
      </p>
    );
  }

  if (!game) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontFamily: "var(--sgl-head)", fontSize: 24, fontWeight: 700, color: "var(--sgl-ink)" }}>
          Тоглолт олдсонгүй
        </div>
        <Link href="/schedule" className="sgl-btn sgl-btn-ghost" style={{ marginTop: 18 }}>
          ← Хуваарь руу буцах
        </Link>
      </div>
    );
  }

  const homeTeam = teamMap.get(game.homeTeamId) ?? null;
  const awayTeam = teamMap.get(game.awayTeamId) ?? null;
  const homeColor = homeTeam?.colors?.primary || "#F15F22";
  const awayColor = awayTeam?.colors?.primary || "#0072BC";

  const isLive = game.status === "live";
  const isFinished = game.status === "finished";
  const started = isLive || isFinished;
  const homeWon = isFinished && game.homeScore > game.awayScore;
  const awayWon = isFinished && game.awayScore > game.homeScore;

  const homeEntries = boxscores.filter((b) => b.teamId === game.homeTeamId);
  const awayEntries = boxscores.filter((b) => b.teamId === game.awayTeamId);
  const homeTotals = calcTotals(homeEntries);
  const awayTotals = calcTotals(awayEntries);
  const hasStats = homeEntries.length > 0 || awayEntries.length > 0;

  // tug-of-war comparison rows (7, like the design ref)
  const compare: { label: string; home: number; away: number; fmt: (v: number) => string }[] = [
    { label: "Хаялтын %", home: pct(homeTotals.fgMade, homeTotals.fgAttempted), away: pct(awayTotals.fgMade, awayTotals.fgAttempted), fmt: (v) => v.toFixed(1) + "%" },
    { label: "3 онооны %", home: pct(homeTotals.threeMade, homeTotals.threeAttempted), away: pct(awayTotals.threeMade, awayTotals.threeAttempted), fmt: (v) => v.toFixed(1) + "%" },
    { label: "Чөлөөт %", home: pct(homeTotals.ftMade, homeTotals.ftAttempted), away: pct(awayTotals.ftMade, awayTotals.ftAttempted), fmt: (v) => v.toFixed(1) + "%" },
    { label: "Самбар", home: homeTotals.rebounds, away: awayTotals.rebounds, fmt: (v) => String(Math.round(v)) },
    { label: "Дамжуулалт", home: homeTotals.assists, away: awayTotals.assists, fmt: (v) => String(Math.round(v)) },
    { label: "Таслалт", home: homeTotals.steals, away: awayTotals.steals, fmt: (v) => String(Math.round(v)) },
    { label: "Алдаа", home: homeTotals.turnovers, away: awayTotals.turnovers, fmt: (v) => String(Math.round(v)) },
  ];

  const statusBadge = isLive
    ? { text: "● ШУУД", bg: "rgba(229,57,70,.16)", color: "#FF6B73" }
    : isFinished
      ? { text: "ДУУССАН", bg: "rgba(31,158,90,.18)", color: "#4ADE80" }
      : { text: "ТОВЛОГДСОН", bg: "rgba(255,255,255,.1)", color: "#C9C9D0" };

  return (
    <>
      {/* BREADCRUMB */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)", display: "flex", alignItems: "center", gap: 7, padding: "16px 0 0" }}>
        <Link href="/schedule" style={{ color: "var(--sgl-muted)" }}>Хуваарь</Link>
        <span>/</span>
        <span style={{ color: "var(--sgl-ink)" }}>
          {homeTeam?.shortName || "HOME"} vs {awayTeam?.shortName || "AWAY"}
        </span>
      </div>

      {/* SCOREBOARD */}
      <section style={{ paddingTop: 14 }}>
        <div
          className="sgl-reveal"
          style={{ position: "relative", borderRadius: 26, overflow: "hidden", background: "#17171F", color: "#fff", padding: "30px 30px 26px" }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "50%", background: homeColor, opacity: 0.16 }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: awayColor, opacity: 0.16 }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            {/* status */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: statusBadge.color,
                  background: statusBadge.bg,
                  padding: "6px 16px",
                  borderRadius: 999,
                  animation: isLive ? "sgl-pulse-live 1.4s infinite" : undefined,
                }}
              >
                {statusBadge.text}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              {/* home */}
              <Link
                href={`/teams/${game.homeTeamId}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11, flex: 1, minWidth: 0 }}
              >
                {homeTeam?.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.shortName || "Home"} style={{ width: 64, height: 64, borderRadius: 18, objectFit: "contain", background: "#fff", padding: 5 }} />
                ) : (
                  <span style={{ width: 64, height: 64, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: homeColor, fontFamily: "var(--sgl-head)", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                    {homeTeam?.shortName || "HOM"}
                  </span>
                )}
                <span className="sgl-gd-teamname" style={{ fontFamily: "var(--sgl-head)", fontWeight: 600, textAlign: "center", lineHeight: 1.05 }}>
                  {homeTeam?.name || "Home"}
                </span>
              </Link>

              {/* score */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span
                    className="sgl-gd-score"
                    style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, lineHeight: 1, color: started ? (isFinished && !homeWon ? "#7A7A86" : "#fff") : "#5B5B66" }}
                  >
                    {started ? game.homeScore : "–"}
                  </span>
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 30, fontWeight: 600, color: "#5B5B66" }}>–</span>
                  <span
                    className="sgl-gd-score"
                    style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, lineHeight: 1, color: started ? (isFinished && !awayWon ? "#7A7A86" : "#fff") : "#5B5B66" }}
                  >
                    {started ? game.awayScore : "–"}
                  </span>
                </div>
                {isLive && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, background: "rgba(229,57,70,.16)", padding: "5px 14px", borderRadius: 999 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E53946", animation: "sgl-pulse-live 1.4s infinite" }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#FF6B73" }}>LIVE</span>
                  </div>
                )}
              </div>

              {/* away */}
              <Link
                href={`/teams/${game.awayTeamId}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11, flex: 1, minWidth: 0 }}
              >
                {awayTeam?.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.shortName || "Away"} style={{ width: 64, height: 64, borderRadius: 18, objectFit: "contain", background: "#fff", padding: 5 }} />
                ) : (
                  <span style={{ width: 64, height: 64, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: awayColor, fontFamily: "var(--sgl-head)", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                    {awayTeam?.shortName || "AWY"}
                  </span>
                )}
                <span className="sgl-gd-teamname" style={{ fontFamily: "var(--sgl-head)", fontWeight: 600, textAlign: "center", lineHeight: 1.05 }}>
                  {awayTeam?.name || "Away"}
                </span>
              </Link>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 20, fontSize: 12, fontWeight: 600, color: "#9A9AA4", flexWrap: "wrap" }}>
              <span>📅 {formatFullDate(game.date)}</span>
              {game.location && <span>📍 {game.location}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM COMPARE + PERFORMERS */}
      {hasStats ? (
        <section style={{ padding: "18px 0 30px" }}>
          <div className="sgl-gd-grid">
            {/* tug of war */}
            <div className="sgl-card sgl-reveal" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: "var(--sgl-head)", fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--sgl-ink)" }}>
                Багуудын харьцуулалт
              </h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: "var(--sgl-ink)" }}>
                  <span style={{ width: 11, height: 11, borderRadius: 4, background: homeColor }} />
                  {homeTeam?.shortName || "HOME"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: "var(--sgl-ink)" }}>
                  {awayTeam?.shortName || "AWAY"}
                  <span style={{ width: 11, height: 11, borderRadius: 4, background: awayColor }} />
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {compare.map((c) => {
                  const denom = Math.max(c.home, c.away, 1);
                  const homeLeads = c.home >= c.away;
                  return (
                    <div key={c.label}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontFamily: "var(--sgl-head)", fontSize: 15, fontWeight: 700, color: homeLeads ? homeColor : "var(--sgl-ink)" }}>
                          {c.fmt(c.home)}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "var(--sgl-muted)" }}>
                          {c.label}
                        </span>
                        <span style={{ fontFamily: "var(--sgl-head)", fontSize: 15, fontWeight: 700, color: !homeLeads ? awayColor : "var(--sgl-ink)" }}>
                          {c.fmt(c.away)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, height: 10 }}>
                        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", height: "100%", borderRadius: "999px 0 0 999px", background: "rgba(23,23,31,.05)", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${(c.home / denom) * 100}%`, background: homeColor, borderRadius: "999px 0 0 999px" }} />
                        </div>
                        <div style={{ flex: 1, height: "100%", borderRadius: "0 999px 999px 0", background: "rgba(23,23,31,.05)", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${(c.away / denom) * 100}%`, background: awayColor, borderRadius: "0 999px 999px 0" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* top performers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <PerformersCard team={homeTeam} entries={homeEntries} fallbackColor="#F15F22" />
              <PerformersCard team={awayTeam} entries={awayEntries} fallbackColor="#0072BC" />
            </div>
          </div>
        </section>
      ) : (
        <section style={{ padding: "18px 0 30px" }}>
          <div className="sgl-card" style={{ textAlign: "center", padding: "54px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(241,95,34,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#FF8E54,#E0490F)" }} />
            </div>
            <div style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, color: "var(--sgl-ink)" }}>
              Статистик оруулаагүй байна
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--sgl-muted)", marginTop: 8 }}>
              {isFinished
                ? "Энэ тоглолтын дэлгэрэнгүй статистик удахгүй нэмэгдэнэ."
                : "Тоглолт эхэлсний дараа статистик харагдана."}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
