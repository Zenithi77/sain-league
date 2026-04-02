"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Team } from "@/types";
import { getTeams, deleteTeam } from "@/lib/firestore";

function getPct(wins: number, losses: number) {
  const total = wins + losses;
  if (total === 0) return "0.0";
  return ((wins / total) * 100).toFixed(1);
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConference, setSelectedConference] = useState("All");

  useEffect(() => {
    getTeams()
      .then((data) => setTeams(data))
      .catch((err) => console.error("Error fetching teams:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    const team = teams.find((t) => t.id === id);
    if (
      !window.confirm(
        `"${team?.name}" багийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      )
    )
      return;
    try {
      await deleteTeam(id);
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("Баг устгахад алдаа гарлаа");
    }
  };

  const filteredTeams = useMemo(() => {
    let result = teams;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.shortName.toLowerCase().includes(lower) ||
          t.school?.toLowerCase().includes(lower) ||
          t.coach?.name?.toLowerCase().includes(lower),
      );
    }
    if (selectedConference !== "All") {
      result = result.filter((t) => t.conference === selectedConference);
    }
    return result.sort(
      (a, b) => b.stats.wins - a.stats.wins || a.stats.losses - b.stats.losses,
    );
  }, [teams, searchTerm, selectedConference]);

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>
            <i className="fas fa-users"></i> Багууд
          </h1>
          <p>Нийт {teams.length} баг</p>
        </div>
        <Link href="/admin/teams/add" className="btn btn-primary">
          <i className="fas fa-plus"></i> Баг нэмэх
        </Link>
      </div>

      {/* Filters */}
      <div className="players-filters" style={{ marginBottom: 24 }}>
        <div className="players-filter-group">
          <div className="players-search-wrapper">
            <i className="fas fa-search players-search-icon"></i>
            <input
              type="text"
              className="players-search-input"
              placeholder="Баг, сургууль, дасгалжуулагч хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="players-select-wrapper">
            <label className="players-filter-label">Бүс</label>
            <select
              className="players-select"
              value={selectedConference}
              onChange={(e) => setSelectedConference(e.target.value)}
            >
              <option value="All">Бүгд</option>
              <option value="west">Баруун (West)</option>
              <option value="east">Зүүн (East)</option>
            </select>
          </div>
        </div>
        <div className="players-count-badge">
          <i className="fas fa-users"></i> {filteredTeams.length} баг
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
          <p style={{ marginTop: 16 }}>Ачаалж байна...</p>
        </div>
      ) : (
        <div
          className="admin-section"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <table className="sgl-teams-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th className="sgl-th-rank">#</th>
                <th className="sgl-th-team">Баг</th>
                <th className="sgl-th-num">Бүс</th>
                <th className="sgl-th-num">W</th>
                <th className="sgl-th-num">L</th>
                <th className="sgl-th-num">GP</th>
                <th className="sgl-th-num">PCT</th>
                <th className="sgl-th-num">Дасгалжуулагч</th>
                <th className="sgl-th-num" style={{ width: 110 }}>
                  Үйлдэл
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((team, i) => {
                const pct = getPct(team.stats.wins, team.stats.losses);
                const accent = team.colors?.primary || "#F15F22";
                return (
                  <tr key={team.id} className="sgl-team-tr">
                    <td className="sgl-td-rank">
                      <span className="sgl-rank-badge">{i + 1}</span>
                    </td>
                    <td className="sgl-td-team">
                      <div
                        className="sgl-team-link"
                        style={{ cursor: "default" }}
                      >
                        <span
                          className="sgl-team-logo"
                          style={{ background: accent }}
                        >
                          {team.shortName}
                        </span>
                        <div className="sgl-team-text">
                          <span className="sgl-team-name">{team.name}</span>
                          <span className="sgl-team-school">{team.school}</span>
                        </div>
                      </div>
                    </td>
                    <td className="sgl-td-num">
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background:
                            team.conference === "west"
                              ? "rgba(241,95,34,0.15)"
                              : "rgba(0,114,188,0.15)",
                          color:
                            team.conference === "west" ? "#F15F22" : "#0072bc",
                        }}
                      >
                        {team.conference === "west" ? "WEST" : "EAST"}
                      </span>
                    </td>
                    <td className="sgl-td-num sgl-wins">{team.stats.wins}</td>
                    <td className="sgl-td-num sgl-losses">
                      {team.stats.losses}
                    </td>
                    <td className="sgl-td-num">{team.stats.gamesPlayed}</td>
                    <td className="sgl-td-num sgl-pct">
                      <div className="sgl-pct-wrap">
                        <div
                          className="sgl-pct-bar"
                          style={{ width: `${pct}%`, background: accent }}
                        ></div>
                        <span>{pct}%</span>
                      </div>
                    </td>
                    <td
                      className="sgl-td-num"
                      style={{ fontSize: 13, color: "var(--text-muted)" }}
                    >
                      {team.coach?.name || "—"}
                    </td>
                    <td className="sgl-td-num">
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          justifyContent: "center",
                        }}
                      >
                        <Link
                          href={`/admin/teams/${team.id}/edit`}
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => handleDelete(team.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTeams.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: 32,
                      color: "var(--text-muted)",
                    }}
                  >
                    <i className="fas fa-search" style={{ marginRight: 8 }}></i>
                    Хайлтын үр дүн олдсонгүй
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
