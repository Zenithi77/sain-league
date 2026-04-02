"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Team, Player } from "@/types";
import { getTeams, getPlayers, deletePlayer } from "@/lib/firestore";

interface PlayerWithTeam extends Player {
  teamName?: string;
  teamColor?: string;
}

const POSITION_COLORS: Record<string, string> = {
  PG: "#F15F22",
  SG: "#0072bc",
  SF: "#16a34a",
  PF: "#7c3aed",
  C: "#dc2626",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("All");
  const [selectedPosition, setSelectedPosition] = useState("All");

  useEffect(() => {
    Promise.all([getPlayers(), getTeams()])
      .then(([playersData, teamsData]) => {
        const enriched = playersData.map((p) => ({
          ...p,
          teamName: teamsData.find((t) => t.id === p.teamId)?.name,
          teamColor: teamsData.find((t) => t.id === p.teamId)?.colors?.primary,
        }));
        setPlayers(enriched);
        setTeams(teamsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    const player = players.find((p) => p.id === id);
    if (
      !window.confirm(
        `"${player?.name}" тоглогчийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      )
    )
      return;
    try {
      await deletePlayer(id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting player:", error);
      alert("Тоглогч устгахад алдаа гарлаа");
    }
  };

  const positions = useMemo(() => {
    const pos = new Set(players.map((p) => p.position));
    return ["All", ...Array.from(pos).sort()];
  }, [players]);

  const teamOptions = useMemo(
    () => [
      { value: "All", label: "Бүх баг" },
      ...teams
        .map((t) => ({ value: t.id, label: t.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [teams],
  );

  const filteredPlayers = useMemo(() => {
    let result = players;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.teamName?.toLowerCase().includes(lower) ||
          p.college?.toLowerCase().includes(lower),
      );
    }
    if (selectedTeam !== "All")
      result = result.filter((p) => p.teamId === selectedTeam);
    if (selectedPosition !== "All")
      result = result.filter((p) => p.position === selectedPosition);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [players, searchTerm, selectedTeam, selectedPosition]);

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>
            <i className="fas fa-users"></i> Тоглогчид
          </h1>
          <p>Нийт {players.length} тоглогч</p>
        </div>
        <Link href="/admin/players/add" className="btn btn-primary">
          <i className="fas fa-plus"></i> Тоглогч нэмэх
        </Link>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <i
            className="fas fa-search"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              fontSize: 13,
              pointerEvents: "none",
            }}
          ></i>
          <input
            type="text"
            placeholder="Нэр, баг, сургууль хайх..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Team filter */}
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{
            padding: "9px 14px",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: 13,
            cursor: "pointer",
            flex: "0 1 180px",
          }}
        >
          {teamOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Position filter */}
        <select
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          style={{
            padding: "9px 14px",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: 13,
            cursor: "pointer",
            flex: "0 1 140px",
          }}
        >
          {positions.map((pos) => (
            <option key={pos} value={pos}>
              {pos === "All" ? "Бүх байрлал" : pos}
            </option>
          ))}
        </select>

        {/* Count pill */}
        <div
          style={{
            marginLeft: "auto",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 13,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          <i
            className="fas fa-user"
            style={{ marginRight: 6, color: "var(--primary-color)" }}
          ></i>
          {filteredPlayers.length} тоглогч
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-dark)",
                  borderBottom: "2px solid var(--border-color)",
                }}
              >
                <th style={TH}>#</th>
                <th style={{ ...TH, textAlign: "left", paddingLeft: 16 }}>
                  Тоглогч
                </th>
                <th style={TH}>Байрлал</th>
                <th style={{ ...TH, textAlign: "left" }}>Баг</th>
                <th style={TH}>Дугаар</th>
                <th style={TH}>Өндөр</th>
                <th style={{ ...TH, textAlign: "left" }}>Сургууль</th>
                <th style={TH}>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--text-muted)",
                    }}
                  >
                    <i
                      className="fas fa-search"
                      style={{
                        fontSize: 24,
                        display: "block",
                        marginBottom: 10,
                      }}
                    ></i>
                    Хайлтын үр дүн олдсонгүй
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player, i) => {
                  const posColor =
                    POSITION_COLORS[player.position] || "var(--text-muted)";
                  return (
                    <tr
                      key={player.id}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-dark)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {/* # */}
                      <td
                        style={{
                          ...TD,
                          width: 48,
                          color: "var(--text-muted)",
                          fontSize: 13,
                        }}
                      >
                        {i + 1}
                      </td>

                      {/* Player */}
                      <td style={{ ...TD, paddingLeft: 16 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: player.teamColor
                                ? `${player.teamColor}22`
                                : "var(--bg-dark)",
                              border: `2px solid ${player.teamColor || "var(--border-color)"}`,
                              overflow: "hidden",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 700,
                              color: player.teamColor || "var(--text-muted)",
                            }}
                          >
                            {player.image ? (
                              <img
                                src={player.image}
                                alt={player.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              getInitials(player.name)
                            )}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {player.name}
                          </span>
                        </div>
                      </td>

                      {/* Position badge */}
                      <td style={{ ...TD, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background: `${posColor}20`,
                            color: posColor,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {player.position}
                        </span>
                      </td>

                      {/* Team */}
                      <td style={TD}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {player.teamColor && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: player.teamColor,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span style={{ fontSize: 13 }}>
                            {player.teamName || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Number */}
                      <td
                        style={{
                          ...TD,
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        #{player.number}
                      </td>

                      {/* Height */}
                      <td
                        style={{
                          ...TD,
                          textAlign: "center",
                          fontSize: 13,
                          color: "var(--text-muted)",
                        }}
                      >
                        {player.height || "—"}
                      </td>

                      {/* School */}
                      <td
                        style={{
                          ...TD,
                          fontSize: 13,
                          color: "var(--text-muted)",
                        }}
                      >
                        {player.college || "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ ...TD, textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "center",
                          }}
                        >
                          <Link
                            href={`/admin/players/${player.id}/edit`}
                            className="btn btn-secondary"
                            style={{
                              padding: "5px 11px",
                              fontSize: 12,
                              borderRadius: 8,
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </Link>
                          <button
                            className="btn btn-danger"
                            style={{
                              padding: "5px 11px",
                              fontSize: 12,
                              borderRadius: 8,
                            }}
                            onClick={() => handleDelete(player.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TH: React.CSSProperties = {
  padding: "11px 12px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
  color: "var(--text-muted)",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "12px 12px",
  verticalAlign: "middle",
};
