"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Team, CoachProfile, CoachType } from "@/types";
import { getTeams, getCoaches, deleteCoach } from "@/lib/firestore";

interface CoachWithTeam extends CoachProfile {
  teamName?: string;
  teamColor?: string;
}

const COACH_TYPE_LABELS: Record<CoachType, string> = {
  HeadCoach: "Ерөнхий дасгалжуулагч",
  AssociateCoach: "Туслах дасгалжуулагч",
  AssistantCoach: "Нэмэлт дасгалжуулагч",
};

const COACH_TYPE_COLORS: Record<CoachType, string> = {
  HeadCoach: "#F15F22",
  AssociateCoach: "#0072bc",
  AssistantCoach: "#16a34a",
};

function getInitials(firstName: string, lastName: string) {
  return `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase() || "?";
}

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<CoachWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    Promise.all([getCoaches(), getTeams()])
      .then(([coachesData, teamsData]) => {
        const enriched = coachesData.map((c) => ({
          ...c,
          teamName: teamsData.find((t) => t.id === c.teamId)?.name,
          teamColor: teamsData.find((t) => t.id === c.teamId)?.colors?.primary,
        }));
        setCoaches(enriched);
        setTeams(teamsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    const coach = coaches.find((c) => c.id === id);
    const fullName = `${coach?.lastName} ${coach?.firstName}`.trim();
    if (
      !window.confirm(
        `"${fullName}" дасгалжуулагчийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      )
    )
      return;
    try {
      await deleteCoach(id);
      setCoaches((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Error deleting coach:", error);
      alert("Дасгалжуулагч устгахад алдаа гарлаа");
    }
  };

  const teamOptions = useMemo(
    () => [
      { value: "All", label: "Бүх баг" },
      ...teams
        .map((t) => ({ value: t.id, label: t.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [teams],
  );

  const filteredCoaches = useMemo(() => {
    let result = coaches;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.firstName.toLowerCase().includes(lower) ||
          c.lastName.toLowerCase().includes(lower) ||
          c.school?.toLowerCase().includes(lower) ||
          c.teamName?.toLowerCase().includes(lower),
      );
    }
    if (selectedTeam !== "All")
      result = result.filter((c) => c.teamId === selectedTeam);
    if (selectedType !== "All")
      result = result.filter((c) => c.coachType === selectedType);
    return result.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
      ),
    );
  }, [coaches, searchTerm, selectedTeam, selectedType]);

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>
            <i className="fas fa-user-tie"></i> Дасгалжуулагчид
          </h1>
          <p>Нийт {coaches.length} дасгалжуулагч</p>
        </div>
        <Link href="/admin/coaches/add" className="btn btn-primary">
          <i className="fas fa-plus"></i> Дасгалжуулагч нэмэх
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

        {/* Type filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{
            padding: "9px 14px",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: 13,
            cursor: "pointer",
            flex: "0 1 200px",
          }}
        >
          <option value="All">Бүх төрөл</option>
          {(
            ["HeadCoach", "AssociateCoach", "AssistantCoach"] as CoachType[]
          ).map((ct) => (
            <option key={ct} value={ct}>
              {COACH_TYPE_LABELS[ct]}
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
            className="fas fa-user-tie"
            style={{ marginRight: 6, color: "var(--primary-color)" }}
          ></i>
          {filteredCoaches.length} дасгалжуулагч
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
                  Дасгалжуулагч
                </th>
                <th style={TH}>Төрөл</th>
                <th style={{ ...TH, textAlign: "left" }}>Баг</th>
                <th style={{ ...TH, textAlign: "left" }}>Сургууль</th>
                <th style={TH}>Төрсөн он</th>
                <th style={TH}>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoaches.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                    {coaches.length === 0
                      ? "Дасгалжуулагч байхгүй байна. Шинээр нэмнэ үү."
                      : "Хайлтын үр дүн олдсонгүй"}
                  </td>
                </tr>
              ) : (
                filteredCoaches.map((coach, i) => {
                  const typeColor =
                    COACH_TYPE_COLORS[coach.coachType] || "var(--text-muted)";
                  return (
                    <tr
                      key={coach.id}
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

                      {/* Coach */}
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
                              background: coach.teamColor
                                ? `${coach.teamColor}22`
                                : "var(--bg-dark)",
                              border: `2px solid ${coach.teamColor || "var(--border-color)"}`,
                              overflow: "hidden",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 700,
                              color: coach.teamColor || "var(--text-muted)",
                            }}
                          >
                            {coach.image ? (
                              <img
                                src={coach.image}
                                alt={`${coach.lastName} ${coach.firstName}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              getInitials(coach.firstName, coach.lastName)
                            )}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {coach.lastName} {coach.firstName}
                          </span>
                        </div>
                      </td>

                      {/* Coach type badge */}
                      <td style={{ ...TD, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: `${typeColor}20`,
                            color: typeColor,
                            letterSpacing: "0.02em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {COACH_TYPE_LABELS[coach.coachType]}
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
                          {coach.teamColor && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: coach.teamColor,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span style={{ fontSize: 13 }}>
                            {coach.teamName || "—"}
                          </span>
                        </div>
                      </td>

                      {/* School */}
                      <td
                        style={{
                          ...TD,
                          fontSize: 13,
                          color: "var(--text-muted)",
                        }}
                      >
                        {coach.school || "—"}
                      </td>

                      {/* Birth year */}
                      <td
                        style={{
                          ...TD,
                          textAlign: "center",
                          fontSize: 13,
                          color: "var(--text-muted)",
                        }}
                      >
                        {coach.birthYear || "—"}
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
                            href={`/admin/coaches/${coach.id}/edit`}
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
                            onClick={() => handleDelete(coach.id)}
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
