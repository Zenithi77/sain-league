"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GameWithTeams } from "@/types";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export default function TipOffCountdown({ game }: { game: GameWithTeams | null }) {
  const target = game ? new Date(game.date + "T18:00:00").getTime() : 0;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!game) return null;

  const diff = now === null ? 0 : Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const home = game.homeTeam;
  const away = game.awayTeam;
  const boxes = [
    { v: pad(d), l: "Өдөр", accent: false },
    { v: pad(h), l: "Цаг", accent: false },
    { v: pad(m), l: "Мин", accent: false },
    { v: pad(s), l: "Сек", accent: true },
  ];

  return (
    <section className="sgl-section" style={{ paddingTop: 6, paddingBottom: 16 }}>
      <Link
        href={`/game/${game.id}`}
        className="sgl-reveal"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 26,
          background: "#17171F",
          color: "#fff",
          padding: "28px 32px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 26,
        }}
      >
        <div style={{ position: "absolute", right: -40, top: -50, width: 220, height: 220, border: "28px solid rgba(241,95,34,.13)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", left: -30, bottom: -60, width: 170, height: 170, border: "22px solid rgba(32,196,244,.1)", borderRadius: "50%" }} />

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E53946", animation: "sgl-pulse-live 1.4s infinite" }} />
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 2, color: "#FF8244" }}>
              ДАРААГИЙН ТОГЛОЛТ
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: home?.colors?.primary || "#F15F22", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 12, color: "#fff" }}>
                {home?.shortName || "HOM"}
              </span>
              <span style={{ fontFamily: "var(--sgl-head)", fontSize: 20, fontWeight: 600, color: "#6E6E7A" }}>VS</span>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: away?.colors?.primary || "#0072BC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 12, color: "#fff" }}>
                {away?.shortName || "AWY"}
              </span>
            </div>
            <span style={{ fontSize: 13, color: "var(--sgl-muted)", fontWeight: 600, maxWidth: 200, lineHeight: 1.35 }}>
              {home?.name} – {away?.name} тоглолт хүртэл
            </span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 2, display: "flex", gap: 11 }}>
          {boxes.map((b) => (
            <div key={b.l} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--sgl-head)",
                  fontSize: 38,
                  fontWeight: 700,
                  background: b.accent ? "#F15F22" : "rgba(255,255,255,.07)",
                  borderRadius: 14,
                  width: 72,
                  padding: "11px 0",
                  lineHeight: 1,
                  boxShadow: b.accent ? "0 12px 26px -12px rgba(241,95,34,.9)" : "none",
                }}
              >
                {b.v}
              </div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: b.accent ? "#FF8244" : "#7A7A86", fontWeight: 700, marginTop: 8 }}>
                {b.l}
              </div>
            </div>
          ))}
        </div>
      </Link>
    </section>
  );
}
