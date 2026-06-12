"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  useActiveSeason,
  useStandings,
  useTeams,
  FirestoreTeam,
  CachedStandingEntry,
} from "@/lib/firestore-hooks";

function ConferenceCard({
  title,
  sub,
  letter,
  accent,
  headBg,
  rows,
  teamMap,
}: {
  title: string;
  sub: string;
  letter: string;
  accent: string;
  headBg: string;
  rows: CachedStandingEntry[];
  teamMap: Map<string, FirestoreTeam>;
}) {
  return (
    <div className="sgl-card sgl-reveal" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", background: headBg }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--sgl-head)",
            fontWeight: 700,
            fontSize: 20,
            color: "#fff",
          }}
        >
          {letter}
        </span>
        <div>
          <div style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--sgl-ink)" }}>
            {title}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--sgl-muted)", marginTop: 2 }}>
            {sub}
          </div>
        </div>
      </div>

      <div className="sgl-std2-row" style={{ background: "#FBF2EC", fontFamily: "var(--sgl-head)", fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: "var(--sgl-muted)", textTransform: "uppercase" }}>
        <span>#</span>
        <span>Баг</span>
        <span style={{ textAlign: "center" }}>Х</span>
        <span style={{ textAlign: "center" }}>Я</span>
        <span style={{ textAlign: "center" }}>Хувь</span>
        <span className="sgl-std2-extra" style={{ textAlign: "center" }}>Зөрүү</span>
        <span className="sgl-std2-extra" style={{ textAlign: "right" }}>Сүүл 10</span>
      </div>

      {rows.map((r, i) => {
        const team = teamMap.get(r.teamId);
        const zone = i < 4 ? "#1F9E5A" : i < 6 ? "#E0A800" : "transparent";
        const rankColor = i === 0 ? "#F15F22" : i < 4 ? "#1F9E5A" : "#B0B0B8";
        const isW = r.streak.startsWith("W");
        return (
          <Link
            key={r.teamId}
            href={`/teams/${r.teamId}`}
            className="sgl-std2-row sgl-std2-body"
            style={{ position: "relative" }}
          >
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: zone }} />
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 16, fontWeight: 700, color: rankColor }}>
              {i + 1}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              {team?.logo ? (
                <img
                  src={team.logo}
                  alt={team.shortName || "Team"}
                  style={{ width: 28, height: 28, borderRadius: 8, flex: "none", objectFit: "contain", background: "#fff", padding: 2 }}
                />
              ) : (
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: team?.colors?.primary || accent,
                    fontFamily: "var(--sgl-head)",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {team?.shortName?.charAt(0) || "T"}
                </span>
              )}
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--sgl-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {team?.name || r.teamId}
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: isW ? "#1F9E5A" : "#C76B6B" }}>
                  {r.streak}
                </span>
              </span>
            </span>
            <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 14, color: "#1F9E5A" }}>{r.wins}</span>
            <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 600, fontSize: 14, color: "#B0B0B8" }}>{r.losses}</span>
            <span style={{ textAlign: "center", fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 12, color: "var(--sgl-ink)" }}>
              {r.pct.toFixed(3).replace(/^0/, "")}
            </span>
            <span className="sgl-std2-extra" style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)" }}>
              {r.gb === 0 ? "—" : r.gb.toFixed(r.gb % 1 ? 1 : 0)}
            </span>
            <span className="sgl-std2-extra" style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--sgl-muted-2)" }}>{r.l10}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function StandingsPage() {
  const { season } = useActiveSeason();
  const { standings, loading: standingsLoading } = useStandings(season?.id ?? null);
  const { teams, loading: teamsLoading } = useTeams();
  const loading = standingsLoading || teamsLoading;

  const teamMap = useMemo(() => {
    const map = new Map<string, FirestoreTeam>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const west = useMemo(
    () => standings.filter((s) => teamMap.get(s.teamId)?.conference === "west"),
    [standings, teamMap],
  );
  const east = useMemo(
    () => standings.filter((s) => teamMap.get(s.teamId)?.conference === "east"),
    [standings, teamMap],
  );

  const race = useMemo(
    () => [...standings].sort((a, b) => b.wins - a.wins).slice(0, 4),
    [standings],
  );
  const maxWins = Math.max(1, ...race.map((r) => r.wins));

  return (
    <main className="main-content">
      {/* HERO */}
      <section className="sgl-hero" style={{ padding: "44px 34px 30px" }}>
        <div
          className="sgl-hero-blob"
          style={{ top: -70, left: -40, width: 300, height: 300, background: "radial-gradient(circle,rgba(241,95,34,.16),transparent 68%)", animation: "sgl-blob 16s ease-in-out infinite" }}
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
              {season?.year ?? 2026} оны улирал
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(30px, 9vw, 58px)" }}>БАЙР ДАРААЛАЛ</h1>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 18, marginTop: 12 }}>
            <p style={{ maxWidth: 430 }}>
              Хоёр бүсийн өрсөлдөөн. Эхний 4 баг плей-оффт шууд шалгарна.
            </p>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: 5, background: "#1F9E5A" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted-2)" }}>Плей-офф</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: 5, background: "#E0A800" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted-2)" }}>Шигшээ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <p style={{ textAlign: "center", padding: 40, color: "var(--sgl-muted)" }}>Уншиж байна...</p>
      ) : standings.length === 0 ? (
        <p style={{ textAlign: "center", padding: 40, color: "var(--sgl-muted)" }}>Мэдээлэл олдсонгүй</p>
      ) : (
        <>
          <section className="sgl-std2-grid">
            <ConferenceCard title="Баруун бүс" sub="WEST CONFERENCE" letter="W" accent="#F15F22" headBg="#FFF3EC" rows={west} teamMap={teamMap} />
            <ConferenceCard title="Зүүн бүс" sub="EAST CONFERENCE" letter="E" accent="#0072BC" headBg="#E8F1FA" rows={east} teamMap={teamMap} />
          </section>

          {/* TITLE RACE */}
          <section className="sgl-section" style={{ paddingTop: 26 }}>
            <div style={{ background: "#17171F", color: "#fff", borderRadius: 24, padding: "28px 30px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -40, top: -50, width: 200, height: 200, border: "26px solid rgba(241,95,34,.12)", borderRadius: "50%" }} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 2, color: "#FF8244" }}>
                  АВАРГЫН ТӨЛӨӨХ ТЭМЦЭЛ
                </span>
                <h2 style={{ fontFamily: "var(--sgl-head)", fontSize: 26, fontWeight: 700, margin: "6px 0 20px" }}>
                  Тэргүүлэгч 4 баг
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {race.map((r) => {
                    const team = teamMap.get(r.teamId);
                    const color = team?.colors?.primary || "#F15F22";
                    return (
                      <div key={r.teamId} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {team?.logo ? (
                          <img src={team.logo} alt={team.shortName || "Team"} style={{ width: 30, height: 30, borderRadius: 9, flex: "none", objectFit: "contain", background: "#fff", padding: 2 }} />
                        ) : (
                          <span style={{ width: 30, height: 30, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: color, fontFamily: "var(--sgl-head)", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                            {team?.shortName?.charAt(0) || "T"}
                          </span>
                        )}
                        <span style={{ width: 150, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} className="sgl-hide-md-inline">
                          {team?.name || r.teamId}
                        </span>
                        <span style={{ flex: 1, height: 12, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${(r.wins / maxWins) * 100}%`, background: color }} />
                        </span>
                        <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 16, width: 54, textAlign: "right" }}>
                          {r.wins}-{r.losses}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
