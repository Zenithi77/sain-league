"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useActiveSeason,
  useTeams,
  FirestoreTeam,
} from "@/lib/firestore-hooks";

// ---------------------------------------------------------------------------
// Cloud Function URL
// ---------------------------------------------------------------------------
const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_URL ??
  "http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadResult {
  ok: boolean;
  gameId?: string;
  homeScore?: number;
  awayScore?: number;
  playersWritten?: number;
  message?: string;
  errors?: string[];
  error?: string;
}

// Columns for manual input (same as AdminUploadCsv)
const MANUAL_COLUMNS = [
  { key: "jerseyNumber", label: "#", type: "number", width: 50 },
  { key: "playerName", label: "Нэр", type: "text", width: 140 },
  { key: "minutesPlayed", label: "MIN", type: "text", width: 55 },
  {
    key: "fieldGoals",
    label: "FG",
    type: "text",
    width: 60,
    placeholder: "5/12",
  },
  { key: "fieldGoalPercentage", label: "FG%", type: "text", width: 55 },
  {
    key: "twoPointFieldGoals",
    label: "2PT",
    type: "text",
    width: 60,
    placeholder: "3/8",
  },
  { key: "twoPointPercentage", label: "2P%", type: "text", width: 55 },
  {
    key: "threePointFieldGoals",
    label: "3PT",
    type: "text",
    width: 60,
    placeholder: "2/4",
  },
  { key: "threePointPercentage", label: "3P%", type: "text", width: 55 },
  {
    key: "freeThrows",
    label: "FT",
    type: "text",
    width: 60,
    placeholder: "4/5",
  },
  { key: "freeThrowPercentage", label: "FT%", type: "text", width: 55 },
  { key: "offensiveRebounds", label: "OREB", type: "number", width: 38 },
  { key: "defensiveRebounds", label: "DREB", type: "number", width: 38 },
  { key: "totalRebounds", label: "REB", type: "number", width: 36 },
  { key: "assists", label: "AST", type: "number", width: 36 },
  { key: "turnovers", label: "TO", type: "number", width: 34 },
  { key: "steals", label: "STL", type: "number", width: 34 },
  { key: "blocks", label: "BLK", type: "number", width: 34 },
  { key: "personalFoulsCommitted", label: "PF", type: "number", width: 50 },
  { key: "personalFoulsDrawn", label: "PFD", type: "number", width: 50 },
  { key: "plusMinus", label: "+/-", type: "number", width: 50 },
  { key: "points", label: "PTS", type: "number", width: 55 },
] as const;

type PlayerRow = Record<string, string>;

function emptyRow(): PlayerRow {
  const row: PlayerRow = {};
  for (const col of MANUAL_COLUMNS) row[col.key] = "";
  return row;
}

function rowsToCsv(rows: PlayerRow[]): string {
  const headers = MANUAL_COLUMNS.map((c) => c.key);
  const lines = [headers.join(",")];
  for (const row of rows) {
    if (headers.every((h) => !row[h]?.trim())) continue;
    lines.push(headers.map((h) => row[h] ?? "").join(","));
  }
  return lines.join("\n");
}

type InputMode = "csv" | "manual";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdminGameStatsInputProps {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminGameStatsInput({
  gameId,
  homeTeamId,
  awayTeamId,
}: AdminGameStatsInputProps) {
  const { userData, getIdToken } = useAuth();
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { teams, loading: teamsLoading } = useTeams(seasonId);

  const [selectedTeamId, setSelectedTeamId] = useState(homeTeamId);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [mode, setMode] = useState<InputMode>("manual");
  const [manualRows, setManualRows] = useState<PlayerRow[]>(() =>
    Array.from({ length: 5 }, () => emptyRow()),
  );
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show for admins
  if (!userData || userData.role !== "admin") return null;

  const loading = seasonLoading || teamsLoading;

  const teamMap = new Map<string, FirestoreTeam>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const homeTeamName = teamMap.get(homeTeamId)?.name ?? homeTeamId;
  const awayTeamName = teamMap.get(awayTeamId)?.name ?? awayTeamId;

  // Manual row helpers
  const updateCell = (rowIdx: number, key: string, value: string) => {
    setManualRows((prev) => {
      const copy = [...prev];
      copy[rowIdx] = { ...copy[rowIdx], [key]: value };
      return copy;
    });
  };

  const addRow = () => setManualRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx: number) =>
    setManualRows((prev) => prev.filter((_, i) => i !== idx));

  // Submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!seasonId || !selectedTeamId) {
      setResult({ ok: false, error: "Улирал, баг сонгоно уу." });
      return;
    }

    let fileToSend: File | null = null;

    if (mode === "csv") {
      if (!csvFile) {
        setResult({ ok: false, error: "CSV файл хавсаргана уу." });
        return;
      }
      fileToSend = csvFile;
    } else {
      const csvText = rowsToCsv(manualRows);
      const nonEmptyLines = csvText.split("\n").length - 1;
      if (nonEmptyLines < 1) {
        setResult({
          ok: false,
          error: "Хамгийн багадаа 1 тоглогчийн мэдээлэл оруулна уу.",
        });
        return;
      }
      const blob = new Blob([csvText], { type: "text/csv" });
      fileToSend = new File([blob], "manual-input.csv", { type: "text/csv" });
    }

    setUploading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Нэвтрэх шаардлагатай");

      const formData = new FormData();
      formData.append("seasonId", seasonId);
      formData.append("gameId", gameId);
      formData.append("teamId", selectedTeamId);
      formData.append("file", fileToSend);

      const res = await fetch(`${FUNCTIONS_BASE_URL}/uploadGameCsv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data: UploadResult = await res.json();
      setResult(data);

      if (data.ok && mode === "csv") {
        setCsvFile(null);
        const fileInput = document.getElementById(
          "gameStatsFileInput",
        ) as HTMLInputElement | null;
        if (fileInput) fileInput.value = "";
      }
    } catch (err: unknown) {
      setResult({
        ok: false,
        error: (err as Error).message || "Сервертэй холбогдоход алдаа гарлаа",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-game-stats-section">
      {/* Collapsible header */}
      <button
        type="button"
        className="admin-game-stats-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>
          <i className="fas fa-shield-alt"></i> Админ: Тоглолтын статистик
          оруулах
        </span>
        <i className={`fas fa-chevron-${isExpanded ? "up" : "down"}`}></i>
      </button>

      {isExpanded && (
        <div className="admin-game-stats-body">
          {loading ? (
            <p style={{ color: "var(--text-muted)", padding: 16 }}>
              Ачаалж байна...
            </p>
          ) : !seasonId ? (
            <p style={{ color: "var(--text-muted)", padding: 16 }}>
              Идэвхтэй улирал олдсонгүй.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Team picker */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>
                  <i className="fas fa-users"></i> Баг сонгох
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="team-select"
                  required
                >
                  <option value={homeTeamId}>{homeTeamName} (Home)</option>
                  <option value={awayTeamId}>{awayTeamName} (Away)</option>
                </select>
              </div>

              {/* Mode tabs */}
              <div style={{ display: "flex", gap: 10, margin: "12px 0" }}>
                <button
                  type="button"
                  className={`btn ${mode === "manual" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setMode("manual")}
                >
                  <i className="fas fa-keyboard"></i> Гараар оруулах
                </button>
                <button
                  type="button"
                  className={`btn ${mode === "csv" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setMode("csv")}
                >
                  <i className="fas fa-file-csv"></i> CSV файл
                </button>
              </div>

              {/* CSV file input */}
              {mode === "csv" && (
                <div style={{ margin: "15px 0" }}>
                  <div
                    className="file-upload"
                    onClick={() =>
                      document.getElementById("gameStatsFileInput")?.click()
                    }
                  >
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p>CSV файлаа энд чирж тавина уу эсвэл дарж сонгоно уу</p>
                    <input
                      type="file"
                      id="gameStatsFileInput"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                      style={{ display: "none" }}
                    />
                  </div>
                  {csvFile && (
                    <p
                      style={{
                        marginTop: 10,
                        color: "var(--primary-color)",
                      }}
                    >
                      <i className="fas fa-file-csv"></i> {csvFile.name}
                    </p>
                  )}
                </div>
              )}

              {/* Manual input table */}
              {mode === "manual" && (
                <div style={{ margin: "15px 0", overflowX: "auto" }}>
                  <table
                    className="stats-table"
                    style={{ fontSize: 13, minWidth: 900 }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}></th>
                        {MANUAL_COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            style={{
                              width: col.width,
                              whiteSpace: "nowrap",
                            }}
                            title={col.key}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {manualRows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => removeRow(rowIdx)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: 14,
                                padding: 2,
                              }}
                              title="Устгах"
                            >
                              ✕
                            </button>
                          </td>
                          {MANUAL_COLUMNS.map((col) => (
                            <td key={col.key} style={{ padding: 2 }}>
                              <input
                                type={col.type}
                                inputMode={
                                  col.type === "number" ? "numeric" : undefined
                                }
                                value={row[col.key] ?? ""}
                                onChange={(e) =>
                                  updateCell(rowIdx, col.key, e.target.value)
                                }
                                placeholder={
                                  "placeholder" in col
                                    ? (col as { placeholder: string })
                                        .placeholder
                                    : ""
                                }
                                style={
                                  {
                                    width: "100%",
                                    padding: "4px 5px",
                                    fontSize: 13,
                                    background: "var(--bg-card)",
                                    color: "var(--text-light)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: 4,
                                    MozAppearance: "textfield",
                                    WebkitAppearance: "none",
                                    appearance: "textfield",
                                  } as React.CSSProperties
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addRow}
                    style={{ marginTop: 8 }}
                  >
                    <i className="fas fa-plus"></i> Тоглогч нэмэх
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading}
              >
                <i className="fas fa-upload"></i>{" "}
                {uploading ? "Уншиж байна..." : "Статистик хадгалах"}
              </button>
            </form>
          )}

          {/* Result display */}
          {result && (
            <div
              style={{
                marginTop: 20,
                padding: 15,
                background: "var(--bg-card)",
                borderRadius: 10,
                borderLeft: `4px solid ${result.ok ? "#4CAF50" : "#ef4444"}`,
              }}
            >
              {result.ok ? (
                <>
                  <p style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    <i className="fas fa-check-circle"></i> Амжилттай!
                  </p>
                  {result.homeScore !== undefined && (
                    <p>
                      Оноо: {result.homeScore} – {result.awayScore}
                    </p>
                  )}
                  {result.playersWritten !== undefined && (
                    <p>Тоглогчид бичигдсэн: {result.playersWritten}</p>
                  )}
                  {result.message && <p>{result.message}</p>}
                </>
              ) : (
                <>
                  <p style={{ color: "#ef4444", fontWeight: "bold" }}>
                    <i className="fas fa-exclamation-circle"></i> Алдаа
                  </p>
                  <p>{result.error}</p>
                  {result.errors && result.errors.length > 0 && (
                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                      {result.errors.map((e, i) => (
                        <li key={i} style={{ color: "#ef4444" }}>
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
