"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PlayerWithAverages } from "@/types";

type SortKey = "pts" | "reb" | "ast" | "stl";

const PAGE_SIZE = 25;

const STAT_META: Record<SortKey, { label: string; short: string; color: string; soft: string; field: keyof PlayerWithAverages["averages"] }> = {
  pts: { label: "Оноо", short: "PTS", color: "#F15F22", soft: "rgba(241,95,34,.1)", field: "pointsPerGame" },
  reb: { label: "Самбар", short: "REB", color: "#20C4F4", soft: "rgba(32,196,244,.12)", field: "reboundsPerGame" },
  ast: { label: "Дамжуулалт", short: "AST", color: "#0072BC", soft: "rgba(0,114,188,.1)", field: "assistsPerGame" },
  stl: { label: "Таслалт", short: "STL", color: "#1F9E5A", soft: "rgba(31,158,90,.12)", field: "stealsPerGame" },
};

const MEDALS = [
  { bg: "#E0A800", label: "АЛТ" },
  { bg: "#A8A8B0", label: "МӨНГӨ" },
  { bg: "#CD7F32", label: "ХҮРЭЛ" },
];

function val(p: PlayerWithAverages, key: SortKey) {
  return parseFloat(p.averages[STAT_META[key].field] || "0");
}

function color(p: PlayerWithAverages) {
  return p.team?.colors?.primary || "#F15F22";
}

export default function PlayersClient({ players }: { players: PlayerWithAverages[] }) {
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("pts");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Show the first page again whenever the list is re-filtered or re-sorted
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, pos, sort]);

  const positions = useMemo(() => {
    const s = new Set(players.map((p) => p.position).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [players]);

  const filtered = useMemo(() => {
    let list = players;
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (pos !== "ALL") list = list.filter((p) => p.position === pos);
    return [...list].sort((a, b) => val(b, sort) - val(a, sort));
  }, [players, search, pos, sort]);

  const podium = filtered.slice(0, 3);
  const shown = filtered.slice(0, visible);
  const meta = STAT_META[sort];

  return (
    <main className="main-content">
      {/* HERO */}
      <section className="sgl-hero" style={{ padding: "44px 34px 24px" }}>
        <div
          className="sgl-hero-blob"
          style={{ top: -70, right: "8%", width: 300, height: 300, background: "radial-gradient(circle,rgba(241,95,34,.15),transparent 68%)", animation: "sgl-blob 16s ease-in-out infinite" }}
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
              2026 оны улирал
            </span>
          </div>
          <h1 style={{ fontSize: 58 }}>ТОГЛОГЧИД</h1>
          <p>Лигийн шилдэг тоглогчид. Нэрээр хайх, байрлалаар шүүх, статистикаар эрэмбэл.</p>
        </div>
      </section>

      {/* PODIUM */}
      {podium.length > 0 && (
        <section className="sgl-section" style={{ paddingTop: 8, paddingBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontFamily: "var(--sgl-head)", fontSize: 20, fontWeight: 700 }}>
              Тэргүүлэгчид: {meta.label}
            </h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)" }}>
              Баганы гарчиг дээр дарж эрэмбэл
            </span>
          </div>
          <div className="sgl-podium">
            {podium.map((p, i) => {
              const c = color(p);
              const medal = MEDALS[i];
              return (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  className="sgl-card sgl-reveal"
                  style={{ position: "relative", padding: 20, overflow: "hidden", display: "block" }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: c }} />
                  <div style={{ position: "absolute", right: 16, top: 10, fontFamily: "var(--sgl-head)", fontSize: 54, fontWeight: 700, color: medal.bg, lineHeight: 1, opacity: 0.18 }}>
                    {i + 1}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 62,
                        height: 74,
                        borderRadius: 14,
                        flex: "none",
                        background: meta.soft,
                        border: `1px solid ${c}33`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, color: c }}>
                          {p.number}
                        </span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: medal.bg, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: "3px 9px", borderRadius: 999, marginBottom: 7 }}>
                        {medal.label}
                      </div>
                      <div style={{ fontFamily: "var(--sgl-head)", fontSize: 19, fontWeight: 600, lineHeight: 1.05, color: "var(--sgl-ink)" }}>
                        {p.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)" }}>
                          {p.teamShortName || p.teamName} · {p.position}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontFamily: "var(--sgl-head)", fontSize: 38, fontWeight: 700, color: c, lineHeight: 1 }}>
                        {val(p, sort).toFixed(1)}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "#B0B0B8", marginTop: 2 }}>
                        {meta.short}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 14 }}>
                      {(["pts", "reb", "ast"] as SortKey[]).map((k) => (
                        <div key={k} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--sgl-head)", fontSize: 16, fontWeight: 700, color: "var(--sgl-ink)" }}>
                            {val(p, k).toFixed(1)}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#C0C0C8" }}>{STAT_META[k].short}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* CONTROLS */}
      <section className="sgl-section" style={{ paddingTop: 18, paddingBottom: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <i className="fas fa-search" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#B0B0B8", fontSize: 13 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Тоглогчийн нэрээр хайх..."
              style={{
                width: "100%",
                background: "#fff",
                border: "1px solid rgba(23,23,31,.1)",
                borderRadius: 14,
                padding: "13px 16px 13px 40px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--sgl-ink)",
                boxShadow: "0 6px 16px -12px rgba(0,0,0,.4)",
                fontFamily: "var(--sgl-body)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {positions.map((pf) => (
              <button
                key={pf}
                onClick={() => setPos(pf)}
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  padding: "9px 15px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: pos === pf ? "#F15F22" : "#fff",
                  color: pos === pf ? "#fff" : "var(--sgl-muted-2)",
                  boxShadow: "0 6px 16px -12px rgba(0,0,0,.4)",
                  transition: "all .2s ease",
                }}
              >
                {pf === "ALL" ? "Бүгд" : pf}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="sgl-section" style={{ paddingTop: 14 }}>
        <div className="sgl-card" style={{ overflow: "hidden" }}>
          <div className="sgl-prow" style={{ background: "#FBF2EC" }}>
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--sgl-muted)" }}>#</span>
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--sgl-muted)", textTransform: "uppercase" }}>
              Тоглогч
            </span>
            {(["pts", "reb", "ast", "stl"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textAlign: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: sort === k ? STAT_META[k].color : "var(--sgl-muted)",
                }}
              >
                {STAT_META[k].short} {sort === k ? "↓" : ""}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "44px 20px", color: "var(--sgl-muted)" }}>
              <div style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, color: "#C7C7CE" }}>
                Тоглогч олдсонгүй
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Өөр нэр эсвэл байрлал сонгоно уу.</p>
            </div>
          ) : (
            shown.map((p, i) => {
              const c = color(p);
              const rankColor = i === 0 ? "#F15F22" : i < 3 ? "#0072BC" : "var(--sgl-muted)";
              return (
                <Link key={p.id} href={`/players/${p.id}`} className="sgl-prow sgl-prow-body">
                  <span style={{ fontFamily: "var(--sgl-head)", fontSize: 16, fontWeight: 700, color: rankColor }}>{i + 1}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        flex: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: c,
                        fontFamily: "var(--sgl-head)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        overflow: "hidden",
                      }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        p.number
                      )}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--sgl-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--sgl-muted)", fontWeight: 600 }}>
                        {p.teamShortName || p.teamName} · {p.position}
                      </span>
                    </span>
                  </span>
                  {(["pts", "reb", "ast", "stl"] as SortKey[]).map((k) => (
                    <span
                      key={k}
                      style={{
                        textAlign: "center",
                        fontFamily: "var(--sgl-head)",
                        fontSize: 15,
                        fontWeight: 700,
                        color: sort === k ? STAT_META[k].color : "var(--sgl-ink)",
                      }}
                    >
                      {val(p, k).toFixed(1)}
                    </span>
                  ))}
                </Link>
              );
            })
          )}
        </div>

        {/* LOAD MORE */}
        {filtered.length > shown.length && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 22 }}>
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              style={{
                fontFamily: "var(--sgl-head)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                padding: "13px 34px",
                borderRadius: 999,
                border: "1px solid rgba(241,95,34,.3)",
                cursor: "pointer",
                background: "#fff",
                color: "#F15F22",
                boxShadow: "0 8px 22px -14px rgba(241,95,34,.6)",
                transition: "all .2s ease",
              }}
            >
              Цааш үзэх <i className="fas fa-chevron-down" style={{ fontSize: 11, marginLeft: 6 }} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--sgl-muted)" }}>
              {shown.length} / {filtered.length} тоглогч
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
