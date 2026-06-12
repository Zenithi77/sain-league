"use client";

import { useMemo, useState } from "react";
import { PlayerAggregateDoc, FirestoreTeam } from "@/lib/firestore-hooks";

type Pos = "PG" | "SG" | "SF" | "PF" | "C";
const POSITIONS: Pos[] = ["PG", "SG", "SF", "PF", "C"];

const SLOT_COORDS: Record<Pos, { top: string; left: string }> = {
  C: { top: "20%", left: "50%" },
  PF: { top: "44%", left: "26%" },
  SF: { top: "44%", left: "74%" },
  SG: { top: "70%", left: "33%" },
  PG: { top: "74%", left: "63%" },
};

interface Cand {
  id: string;
  name: string;
  short: string;
  num: number;
  rating: number;
  color: string;
  pos: Pos;
}

export default function BuildYourFive({
  players,
  teamMap,
}: {
  players: PlayerAggregateDoc[];
  teamMap: Map<string, FirestoreTeam>;
}) {
  const byPos = useMemo(() => {
    const groups: Record<Pos, Cand[]> = { PG: [], SG: [], SF: [], PF: [], C: [] };
    players.forEach((p) => {
      const gp = p.gamesPlayed || 1;
      const ppg = p.points / gp;
      const rpg = p.totalRebounds / gp;
      const apg = p.assists / gp;
      const rating = Math.round(Math.min(99, 40 + ppg * 1.6 + rpg * 1.2 + apg * 1.5));
      const team = teamMap.get(p.teamId);
      const pos = POSITIONS[(p.jerseyNumber + p.playerName.length) % 5];
      groups[pos].push({
        id: p.playerId,
        name: p.playerName,
        short: team?.shortName || "",
        num: p.jerseyNumber,
        rating,
        color: team?.colors?.primary || "#F15F22",
        pos,
      });
    });
    POSITIONS.forEach((pos) => {
      groups[pos].sort((a, b) => b.rating - a.rating);
      groups[pos] = groups[pos].slice(0, 4);
    });
    return groups;
  }, [players, teamMap]);

  const [lineup, setLineup] = useState<Record<Pos, Cand | null>>({
    PG: null, SG: null, SF: null, PF: null, C: null,
  });

  const selected = POSITIONS.map((p) => lineup[p]).filter(Boolean) as Cand[];
  const ovr = selected.length
    ? Math.round(selected.reduce((s, c) => s + c.rating, 0) / selected.length)
    : 0;
  const ready = selected.length === 5;

  const pick = (c: Cand) =>
    setLineup((l) => ({ ...l, [c.pos]: l[c.pos]?.id === c.id ? null : c }));
  const reset = () => setLineup({ PG: null, SG: null, SF: null, PF: null, C: null });
  const random = () => {
    const next: Record<Pos, Cand | null> = { PG: null, SG: null, SF: null, PF: null, C: null };
    POSITIONS.forEach((pos) => {
      const arr = byPos[pos];
      if (arr.length) next[pos] = arr[Math.floor(Math.random() * arr.length)];
    });
    setLineup(next);
  };

  if (players.length === 0) return null;

  return (
    <section className="sgl-section">
      <div style={{ marginBottom: 22 }}>
        <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 2, color: "#20C4F4" }}>
          ИНТЕРАКТИВ ТОГЛООМ
        </span>
        <h2 className="sgl-h2" style={{ marginTop: 6 }}>
          <span className="sgl-bar cyan" />
          Мөрөөдлийн тавтаа угсар
        </h2>
        <p style={{ fontSize: 15, color: "var(--sgl-muted-3)", fontWeight: 500, marginTop: 7, maxWidth: 560 }}>
          Байрлал бүрт тоглогчоо сонгож, өөрийн мөрөөдлийн таван бүрдүүл. Дугуйг дарж буцааж хас.
        </p>
      </div>

      <div className="sgl-byf-grid">
        {/* COURT */}
        <div
          style={{
            position: "relative",
            height: 440,
            background: "linear-gradient(180deg,#FFEFE2,#FFF8F2)",
            borderRadius: 24,
            border: "1px solid rgba(241,95,34,.14)",
            overflow: "hidden",
            boxShadow: "var(--sgl-shadow-card)",
          }}
        >
          <div style={{ position: "absolute", top: -180, left: "50%", transform: "translateX(-50%)", width: 380, height: 380, border: "2px solid rgba(0,114,188,.13)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 128, height: 96, border: "2px solid rgba(241,95,34,.16)", borderTop: 0 }} />
          <div style={{ position: "absolute", top: 78, left: "50%", transform: "translate(-50%,-50%)", width: 66, height: 66, border: "2px solid rgba(241,95,34,.16)", borderRadius: "50%" }} />
          {POSITIONS.map((pos) => {
            const c = lineup[pos];
            const coord = SLOT_COORDS[pos];
            return (
              <div
                key={pos}
                style={{
                  position: "absolute",
                  top: coord.top,
                  left: coord.left,
                  transform: "translate(-50%,-50%)",
                  zIndex: 3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  width: 104,
                }}
              >
                <button
                  onClick={() => c && pick(c)}
                  style={{
                    position: "relative",
                    width: 62,
                    height: 62,
                    borderRadius: "50%",
                    border: c ? "none" : "2px dashed rgba(23,23,31,.22)",
                    background: c ? c.color : "rgba(255,255,255,.7)",
                    color: c ? "#fff" : "var(--sgl-muted)",
                    fontFamily: "var(--sgl-head)",
                    fontSize: c ? 20 : 14,
                    fontWeight: 700,
                    cursor: c ? "pointer" : "default",
                    boxShadow: c ? "0 10px 22px -10px rgba(0,0,0,.45)" : "none",
                  }}
                >
                  {c ? c.num : pos}
                  <span style={{ position: "absolute", top: -6, right: -8, background: "#17171F", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999 }}>
                    {pos}
                  </span>
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: c ? "var(--sgl-ink)" : "var(--sgl-muted)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 104 }}>
                  {c ? c.name : "Сонгох"}
                </span>
              </div>
            );
          })}
        </div>

        {/* ROSTER + RATING */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 15, background: "#fff", border: "1px solid var(--sgl-line)", borderRadius: 20, padding: "16px 18px", marginBottom: 16, boxShadow: "var(--sgl-shadow-card)", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", flex: "none" }}>
              <div style={{ fontFamily: "var(--sgl-head)", fontSize: 40, fontWeight: 700, color: "#F15F22", lineHeight: 1 }}>{ovr || "—"}</div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "var(--sgl-muted)", marginTop: 3 }}>OVR</div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--sgl-muted-3)", marginBottom: 7 }}>
                <span>Багийн үнэлгээ</span>
                <span>{selected.length}/5 бүрдсэн</span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: "rgba(23,23,31,.07)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${(selected.length / 5) * 100}%`, background: "linear-gradient(90deg,#F15F22,#20C4F4)", transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />
              </div>
              {ready && <div style={{ fontSize: 12, fontWeight: 700, color: "#1F9E5A", marginTop: 9 }}>★ Таны таван бэлэн боллоо!</div>}
            </div>
            <div style={{ display: "flex", gap: 8, flex: "none" }}>
              <button onClick={random} style={{ fontSize: 12, fontWeight: 700, color: "#0072BC", background: "rgba(0,114,188,.09)", border: "none", padding: "10px 14px", borderRadius: 11, cursor: "pointer" }}>
                Санамсаргүй
              </button>
              <button onClick={reset} style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)", background: "rgba(23,23,31,.05)", border: "none", padding: "10px 14px", borderRadius: 11, cursor: "pointer" }}>
                Цэвэрлэх
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {POSITIONS.map((pos) => (
              <div key={pos}>
                <div style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#B0AAA3", marginBottom: 8 }}>{pos}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {byPos[pos].slice(0, 3).map((c) => {
                    const active = lineup[pos]?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => pick(c)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: active ? "rgba(241,95,34,.1)" : "#fff",
                          border: `1px solid ${active ? "rgba(241,95,34,.4)" : "var(--sgl-line)"}`,
                          borderRadius: 12,
                          padding: "8px 10px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ width: 26, height: 26, borderRadius: 8, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: c.color, color: "#fff", fontFamily: "var(--sgl-head)", fontSize: 11, fontWeight: 700 }}>
                          {c.num}
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--sgl-muted)" }}>{c.short} · {c.rating}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
