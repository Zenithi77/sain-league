"use client";

import { useMemo, useState, useEffect } from "react";
import { FirestoreTeam } from "@/lib/firestore-hooks";

const STORAGE_KEY = "sgl_title_vote_2026";

function seededBase(id: string) {
  let s = 0;
  for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) % 9973;
  return 40 + (s % 160); // baseline votes 40–200
}

export default function FanPoll({ teams }: { teams: FirestoreTeam[] }) {
  const options = useMemo(() => teams.slice(0, 6), [teams]);
  const [vote, setVote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) setVote(v);
    } catch {}
  }, []);

  if (options.length === 0) return null;

  const counts = options.map((t) => ({
    team: t,
    count: seededBase(t.id) + (vote === t.id ? 1 : 0),
  }));
  const total = counts.reduce((s, c) => s + c.count, 0) || 1;

  const castVote = (id: string) => {
    setVote(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  return (
    <section className="sgl-section" style={{ paddingTop: 18, paddingBottom: 6 }}>
      <div className="sgl-card sgl-reveal" style={{ padding: "30px 32px", borderRadius: 26 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
          <div>
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 2, color: "#0072BC" }}>
              ФЕНҮҮДИЙН САНАЛ
            </span>
            <h2 style={{ fontFamily: "var(--sgl-head)", fontSize: 28, fontWeight: 700, marginTop: 6, color: "var(--sgl-ink)" }}>
              Аварга цомыг хэн өргөх вэ?
            </h2>
            <p style={{ fontSize: 14, color: "var(--sgl-muted-3)", fontWeight: 500, marginTop: 5 }}>
              Саналаа өгөөд лигийн фенүүдийн таамаглалыг хар.
            </p>
          </div>
          {vote && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(31,158,90,.1)", color: "#1F9E5A", fontSize: 12, fontWeight: 700, padding: "9px 15px", borderRadius: 999, whiteSpace: "nowrap" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1F9E5A" }} />
              Таны санал бүртгэгдлээ
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {counts.map(({ team, count }) => {
            const pct = Math.round((count / total) * 100);
            const color = team.colors?.primary || "#F15F22";
            const isMine = vote === team.id;
            return (
              <button
                key={team.id}
                onClick={() => castVote(team.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  background: isMine ? "rgba(241,95,34,.06)" : "transparent",
                  border: `1px solid ${isMine ? "rgba(241,95,34,.3)" : "var(--sgl-line)"}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all .2s ease",
                }}
              >
                {team.logo ? (
                  <img src={team.logo} alt={team.shortName || "Team"} style={{ width: 40, height: 40, borderRadius: 12, flex: "none", objectFit: "contain", background: "#fff", padding: 3 }} />
                ) : (
                  <span style={{ width: 40, height: 40, borderRadius: 12, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: color, color: "#fff", fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 12 }}>
                    {team.shortName?.charAt(0) || "T"}
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--sgl-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</span>
                    <span style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 16, color: "var(--sgl-ink)", flex: "none" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: "rgba(23,23,31,.06)", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${pct}%`, background: color, transition: "width .8s cubic-bezier(.2,.7,.2,1)" }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)", flex: "none", width: 78, textAlign: "right" }}>
                  {count} санал
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
