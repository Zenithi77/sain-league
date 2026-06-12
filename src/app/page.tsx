"use client";

import { useMemo } from "react";
import Link from "next/link";
import SeasonBanner from "@/components/SeasonBanner";
import GameCard from "@/components/GameCard";
import SponsorLogos from "@/components/SponsorLogos";
import PodcastPreview from "@/components/PodcastPreview";
import TipOffCountdown from "@/components/home/TipOffCountdown";
import BuildYourFive from "@/components/home/BuildYourFive";
import FanPoll from "@/components/home/FanPoll";
import {
  useActiveSeason,
  useStandings,
  useTeams,
  useGames,
  usePlayerAggregates,
  FirestoreTeam,
  PlayerAggregateDoc,
} from "@/lib/firestore-hooks";
import { GameWithTeams, Team } from "@/types";

const BRAND = ["#F15F22", "#20C4F4", "#0072BC"];

function LeaderColumn({
  title,
  unit,
  color,
  soft,
  players,
  getValue,
  teamMap,
}: {
  title: string;
  unit: string;
  color: string;
  soft: string;
  players: PlayerAggregateDoc[];
  getValue: (p: PlayerAggregateDoc) => number;
  teamMap: Map<string, FirestoreTeam>;
}) {
  const max = Math.max(1, ...players.map(getValue));
  return (
    <div className="sgl-card" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "16px 20px",
          background: soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--sgl-head)",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 0.5,
            color,
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color, opacity: 0.7 }}>
          {unit}
        </span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {players.map((p, i) => {
          const val = getValue(p);
          const team = teamMap.get(p.teamId);
          return (
            <Link
              key={p.playerId}
              href={`/players/${p.playerId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "11px 20px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: i === 0 ? color : "var(--sgl-muted)",
                  width: 18,
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--sgl-ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.playerName}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--sgl-head)",
                      fontWeight: 700,
                      fontSize: 16,
                      color,
                      flex: "none",
                    }}
                  >
                    {val.toFixed(1)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: team?.colors?.primary || color,
                      flex: "none",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 999,
                      background: "rgba(23,23,31,.06)",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        borderRadius: 999,
                        width: `${(val / max) * 100}%`,
                        background: color,
                      }}
                    />
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sgl-muted)" }}>
                    {team?.shortName || ""}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { season } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { standings, loading: standingsLoading } = useStandings(seasonId);
  const { teams } = useTeams();
  const { games: firestoreGames } = useGames(seasonId);
  const { aggregates: playerAggregates } = usePlayerAggregates(seasonId);

  const teamMap = useMemo(() => {
    const map = new Map<string, FirestoreTeam>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const games: GameWithTeams[] = useMemo(() => {
    if (!firestoreGames.length) return [];
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
  }, [firestoreGames, teamMap]);

  const upcomingGames = useMemo(
    () => games.filter((g) => g.status === "scheduled").slice(0, 4),
    [games],
  );

  // Featured game for the hero scoreboard: prefer a live game, else most recent finished
  const featuredGame = useMemo(() => {
    const live = games.find((g) => g.status === "live");
    if (live) return live;
    const finished = games
      .filter((g) => g.status === "finished")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return finished[0] ?? null;
  }, [games]);

  const topScorers = useMemo(
    () =>
      [...playerAggregates]
        .sort((a, b) => b.points / (b.gamesPlayed || 1) - a.points / (a.gamesPlayed || 1))
        .slice(0, 5),
    [playerAggregates],
  );
  const topRebounders = useMemo(
    () =>
      [...playerAggregates]
        .sort(
          (a, b) =>
            b.totalRebounds / (b.gamesPlayed || 1) - a.totalRebounds / (a.gamesPlayed || 1),
        )
        .slice(0, 5),
    [playerAggregates],
  );
  const topAssisters = useMemo(
    () =>
      [...playerAggregates]
        .sort((a, b) => b.assists / (b.gamesPlayed || 1) - a.assists / (a.gamesPlayed || 1))
        .slice(0, 5),
    [playerAggregates],
  );

  const star = topScorers[0];
  const starTeam = star ? teamMap.get(star.teamId) : undefined;

  const ticker = useMemo(() => [...teams, ...teams], [teams]);

  return (
    <>
      <SeasonBanner />

      {/* ===== HERO ===== */}
      <section
        className="sgl-section"
        style={{ position: "relative", overflow: "hidden", paddingTop: 44, paddingBottom: 20 }}
      >
        <div
          className="sgl-hero-blob"
          style={{
            top: -80,
            left: -60,
            width: 340,
            height: 340,
            background: "radial-gradient(circle,rgba(241,95,34,.22),transparent 68%)",
            animation: "sgl-blob 14s ease-in-out infinite",
          }}
        />
        <div
          className="sgl-hero-blob"
          style={{
            top: 60,
            right: -70,
            width: 380,
            height: 380,
            background: "radial-gradient(circle,rgba(32,196,244,.2),transparent 68%)",
            animation: "sgl-blob 17s ease-in-out infinite reverse",
          }}
        />

        <div className="sgl-home-hero" style={{ position: "relative", zIndex: 2 }}>
          <div>
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
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#F15F22",
                  animation: "sgl-pulse-dot 1.8s infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#F15F22",
                }}
              >
                {season?.year ?? 2026} оны улирал эхэллээ
              </span>
            </div>

            <h1
              className="sgl-hero-title"
              style={{
                fontFamily: "var(--sgl-head)",
                fontWeight: 700,
                lineHeight: 0.94,
                margin: "20px 0 0",
                letterSpacing: 0.5,
              }}
            >
              <span style={{ display: "block", color: "#17171F" }}>
                SAIN <span style={{ color: "#F15F22" }}>GIRLS</span>
              </span>
              <span style={{ display: "block", color: "#17171F" }}>
                LEAGUE <span style={{ color: "#20C4F4" }}>{season?.year ?? 2026}</span>
              </span>
            </h1>

            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                color: "var(--sgl-muted-2)",
                maxWidth: 430,
                margin: "22px 0 0",
                fontWeight: 500,
              }}
            >
              Монголын охидын сагсан бөмбөгийн лиг. {teams.length} баг, нэг мөрөөдөл. Талбай дээр
              өөрийгөө илэрхийл.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 13, marginTop: 30 }}>
              <Link href="/teams" className="sgl-btn sgl-btn-primary">
                Багуудыг үзэх <span style={{ fontSize: 18 }}>→</span>
              </Link>
              <Link href="/schedule" className="sgl-btn sgl-btn-ghost">
                Хуваарь харах
              </Link>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 34 }}>
              {[
                { v: teams.length, l: "Баг" },
                { v: `${playerAggregates.length}+`, l: "Тоглогч" },
                { v: firestoreGames.length, l: "Тоглолт" },
              ].map((s, i) => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 26 }}>
                  {i > 0 && (
                    <div style={{ width: 1, height: 36, background: "rgba(23,23,31,.12)" }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontFamily: "var(--sgl-head)",
                        fontSize: 34,
                        fontWeight: 700,
                        color: "#17171F",
                        lineHeight: 1,
                      }}
                    >
                      {s.v}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--sgl-muted)", fontWeight: 600 }}>
                      {s.l}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HERO ART */}
          <div className="sgl-hero-art" style={{ position: "relative", height: 440 }}>
            <div
              style={{
                position: "absolute",
                right: 30,
                bottom: 0,
                width: 280,
                height: 280,
                border: "2px solid rgba(0,114,188,.18)",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 120,
                top: 40,
                width: 150,
                height: 150,
                border: "2px dashed rgba(32,196,244,.3)",
                borderRadius: "50%",
                animation: "sgl-spin-slow 40s linear infinite",
              }}
            />

            {/* star player card */}
            {star && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 20,
                  width: 300,
                  background: "#fff",
                  borderRadius: 26,
                  padding: 22,
                  boxShadow: "0 30px 60px -28px rgba(23,23,31,.45)",
                  zIndex: 3,
                  border: "1px solid rgba(23,23,31,.05)",
                  animation: "sgl-floaty 7s ease-in-out infinite",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--sgl-head)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 1.5,
                      color: "#F15F22",
                      textTransform: "uppercase",
                    }}
                  >
                    ★ Долоо хоногийн од
                  </span>
                </div>
                <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
                  <div
                    style={{
                      width: 80,
                      height: 96,
                      borderRadius: 16,
                      flex: "none",
                      background:
                        "linear-gradient(135deg," +
                        (starTeam?.colors?.primary || "#F15F22") +
                        ",#FFF1E8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--sgl-head)",
                      fontSize: 30,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {star.playerName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--sgl-head)",
                        fontSize: 20,
                        fontWeight: 600,
                        lineHeight: 1.05,
                        color: "#17171F",
                      }}
                    >
                      {star.playerName}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#fff",
                        background: starTeam?.colors?.primary || "#F15F22",
                        padding: "3px 9px",
                        borderRadius: 999,
                      }}
                    >
                      {starTeam?.shortName || ""}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  {[
                    { v: (star.points / (star.gamesPlayed || 1)).toFixed(1), l: "ОНОО", c: "#F15F22", bg: "#FFF3EC" },
                    { v: (star.totalRebounds / (star.gamesPlayed || 1)).toFixed(1), l: "САМБАР", c: "#20C4F4", bg: "#EAF8FE" },
                    { v: (star.assists / (star.gamesPlayed || 1)).toFixed(1), l: "ДАМЖ", c: "#0072BC", bg: "#E8F1FA" },
                  ].map((st) => (
                    <div
                      key={st.l}
                      style={{ background: st.bg, borderRadius: 13, padding: "10px 6px", textAlign: "center" }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--sgl-head)",
                          fontSize: 22,
                          fontWeight: 700,
                          color: st.c,
                          lineHeight: 1,
                        }}
                      >
                        {st.v}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                          color: "var(--sgl-muted)",
                          marginTop: 3,
                        }}
                      >
                        {st.l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* basketball */}
            <div
              style={{
                position: "absolute",
                left: 120,
                bottom: 30,
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "radial-gradient(circle at 34% 28%,#FF8E54,#E0490F)",
                zIndex: 2,
                boxShadow: "0 22px 30px -14px rgba(224,73,15,.7)",
                animation: "sgl-dribble 2.6s cubic-bezier(.5,0,.5,1) infinite",
              }}
            >
              <span style={{ position: "absolute", left: "50%", top: 0, width: 2.5, height: "100%", background: "rgba(80,20,0,.5)", transform: "translateX(-50%)" }} />
              <span style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 2.5, background: "rgba(80,20,0,.5)", transform: "translateY(-50%)" }} />
            </div>

            {/* live scoreboard */}
            {featuredGame && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 44,
                  background: "#17171F",
                  borderRadius: 18,
                  padding: "14px 18px",
                  boxShadow: "0 26px 46px -22px rgba(23,23,31,.7)",
                  zIndex: 4,
                  animation: "sgl-floaty 6s ease-in-out infinite",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#F15F22",
                      animation: "sgl-pulse-dot 1.4s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--sgl-head)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 2,
                      color: "rgba(255,255,255,.85)",
                    }}
                  >
                    {featuredGame.status === "live" ? "LIVE" : "FINAL"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 14, fontWeight: 700, color: "#F15F22", letterSpacing: 0.5 }}>
                    {featuredGame.homeTeam?.shortName || "HME"}
                  </span>
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: 1 }}>
                    {featuredGame.homeScore ?? 0}–{featuredGame.awayScore ?? 0}
                  </span>
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 14, fontWeight: 700, color: "#20C4F4", letterSpacing: 0.5 }}>
                    {featuredGame.awayTeam?.shortName || "AWY"}
                  </span>
                </div>
              </div>
            )}

            {/* points-today badge */}
            <div
              style={{
                position: "absolute",
                right: 26,
                bottom: 40,
                background: "linear-gradient(135deg,#20C4F4,#0072BC)",
                borderRadius: 18,
                padding: "13px 20px",
                textAlign: "center",
                boxShadow: "0 22px 40px -18px rgba(32,196,244,.8)",
                zIndex: 4,
                animation: "sgl-floaty 8s ease-in-out infinite reverse",
              }}
            >
              <div style={{ fontFamily: "var(--sgl-head)", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                +{star ? Math.round(star.points / (star.gamesPlayed || 1)) : 24}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,.9)", marginTop: 4 }}>
                ОНОО TODAY
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TEAM TICKER ===== */}
      {teams.length > 0 && (
        <section className="sgl-ticker">
          <div className="sgl-ticker-track">
            {ticker.map((tm, i) => (
              <div key={`${tm.id}-${i}`} className="sgl-ticker-chip">
                <span className="dot" style={{ background: tm.colors?.primary || "#F15F22" }} />
                <span className="name">{tm.name}</span>
                <span className="short">{tm.shortName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== QUICK STATS ===== */}
      <section className="sgl-section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: 16,
          }}
        >
          {[
            { v: teams.length, l: "Багууд", c: "#F15F22", bg: "#FFF3EC" },
            { v: playerAggregates.length, l: "Тоглогчид", c: "#20C4F4", bg: "#EAF8FE" },
            { v: firestoreGames.length, l: "Тоглолтууд", c: "#0072BC", bg: "#E8F1FA" },
            { v: season?.year ?? 2026, l: "Улирал", c: "#1F9E5A", bg: "#E9F7EF" },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                position: "relative",
                background: "#fff",
                borderRadius: 22,
                padding: 22,
                overflow: "hidden",
                border: "1px solid rgba(23,23,31,.05)",
                boxShadow: "var(--sgl-shadow-card)",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: s.c }} />
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: 5, background: s.c }} />
              </div>
              <div style={{ fontFamily: "var(--sgl-head)", fontSize: 40, fontWeight: 700, lineHeight: 1, color: "#17171F" }}>
                {s.v}
              </div>
              <div style={{ fontSize: 13, color: "var(--sgl-muted)", fontWeight: 600, marginTop: 5 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TIP-OFF COUNTDOWN ===== */}
      <TipOffCountdown game={upcomingGames[0] ?? null} />

      {/* ===== STANDINGS + UPCOMING ===== */}
      <section className="sgl-section">
        <div className="sgl-std-grid">
          <div>
            <div className="sgl-section-head">
              <h2 className="sgl-h2">
                <span className="sgl-bar" />
                Байр дараалал
              </h2>
              <Link href="/standings" className="sgl-view-all">
                Бүгдийг харах →
              </Link>
            </div>
            <div className="sgl-card" style={{ overflow: "hidden" }}>
              <div className="sgl-std-row sgl-std-head">
                <span>#</span>
                <span>Баг</span>
                <span style={{ textAlign: "center" }}>Х</span>
                <span style={{ textAlign: "center" }}>Я</span>
                <span style={{ textAlign: "right" }}>Хувь</span>
              </div>
              {standingsLoading ? (
                <p style={{ padding: 30, textAlign: "center", color: "var(--sgl-muted)" }}>
                  Уншиж байна...
                </p>
              ) : (
                standings.slice(0, 8).map((r) => {
                  const team = teamMap.get(r.teamId);
                  const pct = r.pct ?? 0;
                  const rankColor =
                    r.rank === 1 ? "#F15F22" : r.rank <= 3 ? "#0072BC" : "var(--sgl-muted)";
                  return (
                    <Link key={r.teamId} href={`/teams/${r.teamId}`} className="sgl-std-row sgl-std-body">
                      <span style={{ fontFamily: "var(--sgl-head)", fontSize: 17, fontWeight: 700, color: rankColor }}>
                        {r.rank}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                        {team?.logo ? (
                          <img
                            src={team.logo}
                            alt={team.shortName || "Team"}
                            style={{ width: 30, height: 30, borderRadius: 9, flex: "none", objectFit: "contain", background: "#fff", padding: 2 }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 9,
                              flex: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: team?.colors?.primary || "#F15F22",
                              fontFamily: "var(--sgl-head)",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#fff",
                            }}
                          >
                            {team?.shortName?.charAt(0) || "T"}
                          </span>
                        )}
                        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#17171F",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {team?.name || r.teamId}
                          </span>
                        </span>
                      </span>
                      <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 15, color: "#1F9E5A" }}>
                        {r.wins}
                      </span>
                      <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 600, fontSize: 15, color: "var(--sgl-muted)" }}>
                        {r.losses}
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                        <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 13, color: "#17171F" }}>
                          {(pct * 100).toFixed(0)}%
                        </span>
                        <span style={{ width: "100%", height: 5, borderRadius: 999, background: "rgba(23,23,31,.07)", overflow: "hidden" }}>
                          <span
                            style={{
                              display: "block",
                              height: "100%",
                              borderRadius: 999,
                              width: `${pct * 100}%`,
                              background: team?.colors?.primary || "#F15F22",
                            }}
                          />
                        </span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="sgl-section-head">
              <h2 className="sgl-h2">
                <span className="sgl-bar cyan" />
                Удахгүй болох
              </h2>
              <Link href="/schedule" className="sgl-view-all">
                Бүх хуваарь →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {upcomingGames.length > 0 ? (
                upcomingGames.map((game) => <GameCard key={game.id} game={game} />)
              ) : (
                <p style={{ textAlign: "center", color: "var(--sgl-muted)", padding: 20 }}>
                  Удахгүй болох тоглолт байхгүй байна
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== BUILD YOUR FIVE ===== */}
      <BuildYourFive players={playerAggregates} teamMap={teamMap} />

      {/* ===== LEADERS ===== */}
      {playerAggregates.length > 0 && (
        <section className="sgl-section">
          <div className="sgl-section-head">
            <h2 className="sgl-h2">
              <span className="sgl-bar blue" />
              Лигийн тэргүүлэгчид
            </h2>
            <Link href="/stats" className="sgl-view-all">
              Бүгдийг харах →
            </Link>
          </div>
          <div className="sgl-leaders-grid">
            <LeaderColumn
              title="Оноо"
              unit="PTS"
              color="#F15F22"
              soft="#FFF3EC"
              players={topScorers}
              getValue={(p) => p.points / (p.gamesPlayed || 1)}
              teamMap={teamMap}
            />
            <LeaderColumn
              title="Самбар"
              unit="REB"
              color="#20C4F4"
              soft="#EAF8FE"
              players={topRebounders}
              getValue={(p) => p.totalRebounds / (p.gamesPlayed || 1)}
              teamMap={teamMap}
            />
            <LeaderColumn
              title="Дамжуулалт"
              unit="AST"
              color="#0072BC"
              soft="#E8F1FA"
              players={topAssisters}
              getValue={(p) => p.assists / (p.gamesPlayed || 1)}
              teamMap={teamMap}
            />
          </div>
        </section>
      )}

      {/* ===== FAN POLL ===== */}
      <FanPoll teams={teams} />

      {/* ===== JOIN CTA ===== */}
      <section className="sgl-section">
        <div
          className="sgl-reveal"
          style={{
            position: "relative",
            borderRadius: 30,
            overflow: "hidden",
            background: "linear-gradient(120deg,#F15F22 0%,#20C4F4 58%,#0072BC 100%)",
            padding: "clamp(34px, 6vw, 54px) clamp(22px, 5vw, 44px)",
            color: "#fff",
          }}
        >
          <div style={{ position: "absolute", right: -40, top: -40, width: 220, height: 220, border: "30px solid rgba(255,255,255,.12)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", left: "38%", bottom: -90, width: 200, height: 200, border: "24px solid rgba(255,255,255,.1)", borderRadius: "50%" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 600 }}>
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", opacity: 0.9 }}>
              Чамайг хүлээж байна
            </span>
            <h2 style={{ fontFamily: "var(--sgl-head)", fontSize: "clamp(30px, 7vw, 48px)", fontWeight: 700, lineHeight: 1, margin: "12px 0 14px", letterSpacing: 0.5 }}>
              ТОГЛОХОД БЭЛЭН ҮҮ?
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, fontWeight: 500, opacity: 0.95, maxWidth: 480 }}>
              Sain Girls League-д нэгдэж, сургуулиа төлөөлж, шинэ найзуудтай болж, аварга болох замаа
              эхлүүл.
            </p>
            <Link
              href="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                marginTop: 26,
                background: "#fff",
                color: "#F15F22",
                fontWeight: 800,
                fontSize: 16,
                padding: "16px 30px",
                borderRadius: 999,
                boxShadow: "0 18px 36px -16px rgba(0,0,0,.5)",
              }}
            >
              Бүртгүүлэх <span style={{ fontSize: 18 }}>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SPONSORS + PODCAST ===== */}
      <div className="sgl-section">
        <SponsorLogos />
        <PodcastPreview />
      </div>
    </>
  );
}
