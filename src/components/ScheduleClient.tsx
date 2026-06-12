"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { GameWithTeams, Team } from "@/types";
import {
  useActiveSeason,
  useGames,
  useTeams,
  FirestoreTeam,
} from "@/lib/firestore-hooks";

function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayString(): string {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return fmt(t);
}

const MN_WEEKDAYS = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];
const MN_MONTHS = ["1 сар", "2 сар", "3 сар", "4 сар", "5 сар", "6 сар", "7 сар", "8 сар", "9 сар", "10 сар", "11 сар", "12 сар"];

function dateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${MN_WEEKDAYS[d.getDay()]}, ${MN_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function generateDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arr: Date[] = [];
  for (let i = -7; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    arr.push(d);
  }
  return arr;
}

function statusBadge(status: string): { text: string; bg: string; color: string } {
  if (status === "live") return { text: "LIVE", bg: "rgba(229,57,70,.12)", color: "#E53946" };
  if (status === "finished") return { text: "Дууссан", bg: "rgba(31,158,90,.12)", color: "#1F9E5A" };
  return { text: "Товлогдсон", bg: "rgba(0,114,188,.12)", color: "#0072BC" };
}

function record(team: Team | null): string {
  const s = team?.stats;
  if (!s || (s.wins === undefined && s.losses === undefined)) return "";
  return `${s.wins ?? 0}-${s.losses ?? 0}`;
}

export default function ScheduleClient() {
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { games: firestoreGames, loading: gamesLoading } = useGames(seasonId);
  const { teams: firestoreTeams, loading: teamsLoading } = useTeams(seasonId);

  const games: GameWithTeams[] = useMemo(() => {
    if (!firestoreGames.length) return [];
    const teamMap = new Map<string, FirestoreTeam>();
    firestoreTeams.forEach((t) => teamMap.set(t.id, t));
    return firestoreGames.map((g) => {
      const home = teamMap.get(g.homeTeamId) ?? null;
      const away = teamMap.get(g.awayTeamId) ?? null;
      return {
        id: g.id,
        date: g.date,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        status: g.status as GameWithTeams["status"],
        playerStats: [],
        homeTeam: home ? (home as unknown as Team) : null,
        awayTeam: away ? (away as unknown as Team) : null,
      };
    });
  }, [firestoreGames, firestoreTeams]);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [dates, setDates] = useState<Date[]>([]);

  const tickerRef = useRef<HTMLDivElement>(null);
  const dateBarRef = useRef<HTMLDivElement>(null);

  const dataLoading = seasonLoading || gamesLoading || teamsLoading;

  useEffect(() => {
    const today = todayString();
    setTodayStr(today);
    setSelectedDate(today);
    setDates(generateDates());
    setMounted(true);
  }, []);

  const gamesCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    games.forEach((g) => (counts[g.date] = (counts[g.date] || 0) + 1));
    return counts;
  }, [games]);

  const filteredGames = useMemo(
    () => (selectedDate ? games.filter((g) => g.date === selectedDate) : []),
    [games, selectedDate],
  );

  const tickerGames = useMemo(() => {
    // upcoming + live first, then most recent finished
    const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(0, 12);
  }, [games]);

  const scrollTicker = useCallback((dir: "left" | "right") => {
    tickerRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  }, []);
  const scrollDateBar = useCallback((dir: "left" | "right") => {
    dateBarRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!mounted || !dateBarRef.current) return;
    const el = dateBarRef.current.querySelector(`[data-date="${selectedDate}"]`) as HTMLElement;
    if (el) {
      const c = dateBarRef.current;
      c.scrollTo({ left: Math.max(0, el.offsetLeft - c.offsetWidth / 2 + el.offsetWidth / 2), behavior: "smooth" });
    }
  }, [selectedDate, mounted]);

  const headerLabel =
    selectedDate === todayStr
      ? "ӨНӨӨДРИЙН ТОГЛОЛТУУД"
      : selectedDate
        ? `${dateLabel(selectedDate)} — Тоглолтууд`
        : "";

  if (!mounted || dataLoading) {
    return <p style={{ textAlign: "center", padding: 60, color: "var(--sgl-muted)" }}>Ачаалж байна...</p>;
  }

  return (
    <>
      {/* HERO */}
      <section className="sgl-hero" style={{ padding: "40px 34px 22px" }}>
        <div className="sgl-hero-blob" style={{ top: -70, right: -30, width: 280, height: 280, background: "radial-gradient(circle,rgba(0,114,188,.13),transparent 68%)" }} />
        <div className="sgl-hero-inner">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid rgba(241,95,34,.25)", padding: "7px 15px", borderRadius: 999, boxShadow: "0 8px 22px -14px rgba(241,95,34,.6)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#F15F22", animation: "sgl-pulse-dot 1.8s infinite" }} />
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#F15F22" }}>
              {season?.year ?? 2026} оны улирал
            </span>
          </div>
          <h1 style={{ fontSize: 52 }}>ТОГЛОЛТЫН ХУВААРЬ</h1>
        </div>
      </section>

      {/* GAME TICKER */}
      {tickerGames.length > 0 && (
        <section className="sgl-section" style={{ paddingTop: 14, paddingBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="sgl-sched-arrow" onClick={() => scrollTicker("left")} aria-label="Өмнөх">‹</button>
            <div className="sgl-sched-ticker sgl-noscroll" ref={tickerRef} style={{ flex: 1 }}>
              {tickerGames.map((g) => {
                const badge = statusBadge(g.status);
                const finished = g.status === "finished";
                const homeWon = finished && g.homeScore > g.awayScore;
                const awayWon = finished && g.awayScore > g.homeScore;
                return (
                  <div key={g.id} style={{ flex: "none", width: 264, background: "#fff", borderRadius: 18, border: "1px solid rgba(23,23,31,.06)", boxShadow: "0 14px 34px -26px rgba(0,0,0,.5)", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid rgba(23,23,31,.05)" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)" }}>{dateLabel(g.date)}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: "3px 9px", borderRadius: 999, background: badge.bg, color: badge.color }}>{badge.text}</span>
                    </div>
                    <div style={{ padding: "15px 16px 13px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 11 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 10, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: g.homeTeam?.colors?.primary || "#F15F22", fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                          {g.homeTeam?.shortName?.charAt(0) || "H"}
                        </span>
                        <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 22, color: homeWon ? "#F15F22" : "var(--sgl-ink)", minWidth: 30, textAlign: "center" }}>
                          {finished ? g.homeScore : ""}
                        </span>
                        <span style={{ fontFamily: "var(--sgl-head)", fontSize: 13, fontWeight: 700, color: "var(--sgl-muted)" }}>{finished ? "–" : "VS"}</span>
                        <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 22, color: awayWon ? "#F15F22" : "var(--sgl-ink)", minWidth: 30, textAlign: "center" }}>
                          {finished ? g.awayScore : ""}
                        </span>
                        <span style={{ width: 34, height: 34, borderRadius: 10, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: g.awayTeam?.colors?.primary || "#0072BC", fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                          {g.awayTeam?.shortName?.charAt(0) || "A"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)" }}>
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
                          <span style={{ color: "var(--sgl-muted-2)" }}>{g.homeTeam?.shortName || "HOME"}</span>
                          <span style={{ fontSize: 10, color: "#B0B0B8" }}>{record(g.homeTeam)}</span>
                        </span>
                        <span style={{ width: 1, height: 22, background: "rgba(23,23,31,.08)" }} />
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
                          <span style={{ color: "var(--sgl-muted-2)" }}>{g.awayTeam?.shortName || "AWAY"}</span>
                          <span style={{ fontSize: 10, color: "#B0B0B8" }}>{record(g.awayTeam)}</span>
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: "0 16px 15px" }}>
                      <Link href={`/game/${g.id}`} style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--sgl-blue)", background: "rgba(0,114,188,.08)", padding: "9px 0", borderRadius: 11 }}>
                        {finished ? "Тоглолт харах" : "Дэлгэрэнгүй"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="sgl-sched-arrow" onClick={() => scrollTicker("right")} aria-label="Дараах">›</button>
          </div>
        </section>
      )}

      {/* DATE BAR */}
      <section className="sgl-section" style={{ paddingTop: 8, paddingBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="sgl-sched-arrow" style={{ height: 54 }} onClick={() => scrollDateBar("left")}>‹</button>
          <div className="sgl-sched-dates sgl-noscroll" ref={dateBarRef} style={{ flex: 1 }}>
            {dates.map((d) => {
              const ds = fmt(d);
              const count = gamesCountByDate[ds] || 0;
              const selected = ds === selectedDate;
              const isToday = ds === todayStr;
              return (
                <button
                  key={ds}
                  data-date={ds}
                  onClick={() => setSelectedDate(ds)}
                  style={{
                    position: "relative",
                    flex: "none",
                    minWidth: 72,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    padding: "10px 14px 14px",
                    borderRadius: 14,
                    border: `1px solid ${selected ? "#F15F22" : "rgba(23,23,31,.08)"}`,
                    background: selected ? "#F15F22" : "#fff",
                    color: selected ? "#fff" : "var(--sgl-muted-2)",
                    cursor: "pointer",
                    boxShadow: "0 6px 16px -12px rgba(0,0,0,.4)",
                    transition: "all .2s ease",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, opacity: 0.8 }}>{MN_WEEKDAYS[d.getDay()]}</span>
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 16, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
                    {MN_MONTHS[d.getMonth()]} {d.getDate()}
                  </span>
                  {count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: selected ? "rgba(255,255,255,.25)" : "rgba(241,95,34,.12)", color: selected ? "#fff" : "#F15F22" }}>
                      {count}
                    </span>
                  )}
                  {isToday && !selected && (
                    <span style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: "#F15F22" }} />
                  )}
                </button>
              );
            })}
          </div>
          <button className="sgl-sched-arrow" style={{ height: 54 }} onClick={() => scrollDateBar("right")}>›</button>
        </div>
      </section>

      {/* SELECTED DATE GAMES */}
      <section className="sgl-section" style={{ paddingTop: 18, paddingBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <h2 className="sgl-h2" style={{ fontSize: 24 }}>
            <span className="sgl-bar" style={{ height: 24 }} />
            {headerLabel}
          </h2>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--sgl-muted)", background: "#fff", border: "1px solid var(--sgl-line)", padding: "5px 13px", borderRadius: 999 }}>
            {filteredGames.length} тоглолт
          </span>
        </div>

        {filteredGames.length === 0 ? (
          <div style={{ textAlign: "center", padding: "54px 20px", background: "#fff", borderRadius: 22, border: "1px solid var(--sgl-line-2)", boxShadow: "var(--sgl-shadow-card)" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(241,95,34,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#FF8E54,#E0490F)" }} />
            </div>
            <div style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, color: "var(--sgl-ink)" }}>Тоглолт байхгүй</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--sgl-muted)", marginTop: 8 }}>Энэ өдөр тоглолт товлогдоогүй байна.</p>
          </div>
        ) : (
          <div className="sgl-sched-games">
            {filteredGames.map((g) => {
              const badge = statusBadge(g.status);
              const finished = g.status === "finished";
              const homeWon = finished && g.homeScore > g.awayScore;
              const awayWon = finished && g.awayScore > g.homeScore;
              return (
                <Link key={g.id} href={`/game/${g.id}`} className="sgl-card sgl-reveal" style={{ display: "block", overflow: "hidden", borderRadius: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid rgba(23,23,31,.05)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)" }}>{dateLabel(g.date)}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: "3px 9px", borderRadius: 999, background: badge.bg, color: badge.color }}>{badge.text}</span>
                  </div>
                  <div style={{ padding: "8px 18px 16px" }}>
                    {[
                      { team: g.homeTeam, score: g.homeScore, won: homeWon },
                      { team: g.awayTeam, score: g.awayScore, won: awayWon },
                    ].map((row, i) => (
                      <div key={i}>
                        {i === 1 && <div style={{ height: 1, background: "rgba(23,23,31,.05)" }} />}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                            <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: row.team?.colors?.primary || "#999", fontFamily: "var(--sgl-head)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                              {row.team?.shortName?.charAt(0) || "?"}
                            </span>
                            <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 600, fontSize: 17, color: "var(--sgl-ink)" }}>
                              {row.team?.shortName || "TBD"}
                            </span>
                          </div>
                          <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 24, color: row.won ? "#F15F22" : finished ? "var(--sgl-ink)" : "var(--sgl-muted)" }}>
                            {finished ? row.score : "–"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
