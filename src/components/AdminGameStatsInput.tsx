"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useActiveSeason,
  useTeams,
  FirestoreTeam,
} from "@/lib/firestore-hooks";
import { getPlayersByTeam } from "@/lib/firestore";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Player } from "@/types";

// ---------------------------------------------------------------------------
// Cloud Function URL
// ---------------------------------------------------------------------------
const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_URL ??
  "https://us-central1-sain-league.cloudfunctions.net";

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

// ---------------------------------------------------------------------------
// CSV → manual rows parser (client-side)
// ---------------------------------------------------------------------------

/** Common header aliases → canonical MANUAL_COLUMNS key */
const HEADER_ALIASES: Record<string, string> = {
  "#": "jerseyNumber",
  no: "jerseyNumber",
  number: "jerseyNumber",
  jerseynumber: "jerseyNumber",
  name: "playerName",
  player: "playerName",
  playername: "playerName",
  min: "minutesPlayed",
  minutesplayed: "minutesPlayed",
  fg: "fieldGoals",
  fieldgoals: "fieldGoals",
  "fg%": "fieldGoalPercentage",
  fieldgoalpercentage: "fieldGoalPercentage",
  "2pt": "twoPointFieldGoals",
  twopointfieldgoals: "twoPointFieldGoals",
  "2p%": "twoPointPercentage",
  twopointpercentage: "twoPointPercentage",
  "3pt": "threePointFieldGoals",
  threepointfieldgoals: "threePointFieldGoals",
  "3p%": "threePointPercentage",
  threepointpercentage: "threePointPercentage",
  ft: "freeThrows",
  freethrows: "freeThrows",
  "ft%": "freeThrowPercentage",
  freethrowpercentage: "freeThrowPercentage",
  oreb: "offensiveRebounds",
  offensiverebounds: "offensiveRebounds",
  dreb: "defensiveRebounds",
  defensiverebounds: "defensiveRebounds",
  reb: "totalRebounds",
  totalrebounds: "totalRebounds",
  ast: "assists",
  assists: "assists",
  to: "turnovers",
  tov: "turnovers",
  turnovers: "turnovers",
  stl: "steals",
  steals: "steals",
  blk: "blocks",
  blocks: "blocks",
  pf: "personalFoulsCommitted",
  personalfoulscommitted: "personalFoulsCommitted",
  pfd: "personalFoulsDrawn",
  personalfoulsdrawn: "personalFoulsDrawn",
  "+/-": "plusMinus",
  plusminus: "plusMinus",
  pts: "points",
  points: "points",
};

const VALID_KEYS: Set<string> = new Set(MANUAL_COLUMNS.map((c) => c.key));

function parseCsvToRows(text: string): PlayerRow[] {
  const lines = text
    .replace(/^\uFEFF/, "") // strip BOM
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Map raw headers to canonical keys
  const rawHeaders = lines[0].split(",").map((h) => h.trim());
  const mappedHeaders = rawHeaders.map((h) => {
    const norm = h.toLowerCase().replace(/[\s_]+/g, "");
    return HEADER_ALIASES[norm] ?? h;
  });

  const rows: PlayerRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",");
    const row = emptyRow();
    for (let j = 0; j < mappedHeaders.length; j++) {
      const key = mappedHeaders[j];
      if (VALID_KEYS.has(key)) {
        row[key] = (vals[j] ?? "").trim();
      }
    }
    // Skip fully empty rows
    if (MANUAL_COLUMNS.every((c) => !row[c.key]?.trim())) continue;
    rows.push(row);
  }
  return rows;
}

type InputMode = "csv" | "manual";

// ---------------------------------------------------------------------------
// Player verification
// ---------------------------------------------------------------------------

type VerifyStatus = "unchecked" | "checking" | "found" | "not_found";

interface VerifyInfo {
  status: VerifyStatus;
  rootPlayerId?: string;
  rootPlayerName?: string;
}

/** Must mirror the backend derivePlayerId so we can build the mapping key. */
function derivePlayerId(teamId: string, playerName: string): string {
  const norm = playerName.trim().toLowerCase().replace(/\s+/g, "_");
  return `${teamId}__${norm}`;
}

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

  // ---- Player verification state ----
  const [verification, setVerification] = useState<Map<number, VerifyInfo>>(
    () => new Map(),
  );
  const [checkingAll, setCheckingAll] = useState(false);
  // Cache of fetched team rosters (teamId -> Player[])
  const [rosterCache, setRosterCache] = useState<Map<string, Player[]>>(
    () => new Map(),
  );

  // Reset verification when team changes
  useEffect(() => {
    setVerification(new Map());
    setRosterCache(new Map());
  }, [selectedTeamId]);

  // Prefill manual rows from existing boxscores when team/game/season are set
  useEffect(() => {
    if (!seasonId || !gameId || !selectedTeamId) return;

    const colRef = collection(
      db,
      `seasons/${seasonId}/games/${gameId}/boxscores`,
    );
    const q = query(colRef, where("teamId", "==", selectedTeamId));

    getDocs(q)
      .then(async (snap) => {
        if (snap.empty) {
          // No existing stats — reset to empty rows
          setManualRows(Array.from({ length: 5 }, () => emptyRow()));
          setVerification(new Map());
          return;
        }

        const rows: PlayerRow[] = snap.docs.map((d) => {
          const raw = d.data();
          const row = emptyRow();
          // Map every MANUAL_COLUMNS key from the Firestore doc
          for (const col of MANUAL_COLUMNS) {
            const val = raw[col.key];
            if (val !== undefined && val !== null) {
              row[col.key] = String(val);
            }
          }
          return row;
        });

        setManualRows(rows);
        console.log(
          `[GameStats] Prefilled ${rows.length} rows from existing boxscores`,
        );

        // Auto-verify prefilled rows against root player collection
        try {
          const roster = await getPlayersByTeam(selectedTeamId);
          setRosterCache((prev) => new Map(prev).set(selectedTeamId, roster));
          const newVerification = new Map<number, VerifyInfo>();
          for (let i = 0; i < rows.length; i++) {
            const jerseyStr = rows[i].jerseyNumber?.trim();
            if (!jerseyStr) continue;
            const jerseyNum = parseInt(jerseyStr, 10);
            if (isNaN(jerseyNum)) continue;
            const match = roster.find(
              (p) => p.teamId === selectedTeamId && p.number === jerseyNum,
            );
            if (match) {
              // Overwrite name with canonical name from /players collection
              rows[i] = { ...rows[i], playerName: match.name };
            }
            newVerification.set(
              i,
              match
                ? {
                    status: "found",
                    rootPlayerId: match.id,
                    rootPlayerName: match.name,
                  }
                : { status: "not_found" },
            );
          }
          setManualRows(rows);
          setVerification(newVerification);
          console.log(
            `[GameStats] Auto-verified ${newVerification.size} prefilled rows`,
          );
        } catch (err) {
          console.error("[GameStats] Auto-verify after prefill failed:", err);
          setVerification(new Map());
        }
      })
      .catch((err) => {
        console.error("[GameStats] Failed to prefill boxscores:", err);
      });
  }, [seasonId, gameId, selectedTeamId]);

  // Also reset a row's verification when its jersey number changes
  const updateCellWithVerifyReset = (
    rowIdx: number,
    key: string,
    value: string,
  ) => {
    updateCell(rowIdx, key, value);
    if (key === "jerseyNumber") {
      setVerification((prev) => {
        const next = new Map(prev);
        next.delete(rowIdx);
        return next;
      });
    }
  };

  // Fetch roster (uses cache)
  const fetchRoster = useCallback(
    async (teamId: string): Promise<Player[]> => {
      const cached = rosterCache.get(teamId);
      if (cached) return cached;
      const players = await getPlayersByTeam(teamId);
      setRosterCache((prev) => new Map(prev).set(teamId, players));
      return players;
    },
    [rosterCache],
  );

  // Check a single row
  const checkSingleRow = useCallback(
    async (rowIdx: number) => {
      const row = manualRows[rowIdx];
      const jerseyStr = row?.jerseyNumber?.trim();
      if (!jerseyStr || !selectedTeamId) return;
      const jerseyNum = parseInt(jerseyStr, 10);
      if (isNaN(jerseyNum)) return;

      setVerification((prev) =>
        new Map(prev).set(rowIdx, { status: "checking" }),
      );

      try {
        const roster = await fetchRoster(selectedTeamId);
        const match = roster.find(
          (p) => p.teamId === selectedTeamId && p.number === jerseyNum,
        );
        if (match) {
          // Overwrite name with canonical name from /players collection
          setManualRows((prev) => {
            const copy = [...prev];
            copy[rowIdx] = { ...copy[rowIdx], playerName: match.name };
            return copy;
          });
        }
        setVerification((prev) =>
          new Map(prev).set(
            rowIdx,
            match
              ? {
                  status: "found",
                  rootPlayerId: match.id,
                  rootPlayerName: match.name,
                }
              : { status: "not_found" },
          ),
        );
      } catch {
        setVerification((prev) =>
          new Map(prev).set(rowIdx, { status: "not_found" }),
        );
      }
    },
    [manualRows, selectedTeamId, fetchRoster],
  );

  // Check all non-empty rows at once
  const checkAllRows = useCallback(async () => {
    if (!selectedTeamId) return;
    setCheckingAll(true);
    try {
      const roster = await fetchRoster(selectedTeamId);
      const newVerification = new Map<number, VerifyInfo>();
      const updatedRows = [...manualRows];
      for (let i = 0; i < manualRows.length; i++) {
        const jerseyStr = manualRows[i].jerseyNumber?.trim();
        if (!jerseyStr) continue;
        const jerseyNum = parseInt(jerseyStr, 10);
        if (isNaN(jerseyNum)) continue;
        const match = roster.find(
          (p) => p.teamId === selectedTeamId && p.number === jerseyNum,
        );
        if (match) {
          updatedRows[i] = { ...updatedRows[i], playerName: match.name };
        }
        newVerification.set(
          i,
          match
            ? {
                status: "found",
                rootPlayerId: match.id,
                rootPlayerName: match.name,
              }
            : { status: "not_found" },
        );
      }
      setManualRows(updatedRows);
      setVerification(newVerification);
    } catch {
      // leave as-is
    } finally {
      setCheckingAll(false);
    }
  }, [selectedTeamId, manualRows, fetchRoster]);

  // Compute verification summary for manual mode
  const nonEmptyRowIndices = manualRows
    .map((row, i) => ({ i, row }))
    .filter(({ row }) => {
      const headers = MANUAL_COLUMNS.map((c) => c.key);
      return !headers.every((h) => !row[h]?.trim());
    })
    .map(({ i }) => i);

  const verifiedCount = nonEmptyRowIndices.filter(
    (i) => verification.get(i)?.status === "found",
  ).length;
  const notFoundCount = nonEmptyRowIndices.filter(
    (i) => verification.get(i)?.status === "not_found",
  ).length;
  const allVerified =
    nonEmptyRowIndices.length > 0 &&
    verifiedCount === nonEmptyRowIndices.length;

  // Build playerIdMap for submission (derivedId -> rootPlayerId)
  const buildPlayerIdMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    for (let i = 0; i < manualRows.length; i++) {
      const v = verification.get(i);
      if (v?.status === "found" && v.rootPlayerId) {
        const playerName = manualRows[i].playerName?.trim();
        if (playerName && selectedTeamId) {
          const derivedId = derivePlayerId(selectedTeamId, playerName);
          map[derivedId] = v.rootPlayerId;
        }
      }
    }
    return map;
  };

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
    console.log("[GameStats] handleSubmit fired", {
      mode,
      seasonId,
      selectedTeamId,
      gameId,
    });

    if (!seasonId || !selectedTeamId) {
      console.log("[GameStats] missing seasonId or teamId", {
        seasonId,
        selectedTeamId,
      });
      setResult({ ok: false, error: "Улирал, баг сонгоно уу." });
      return;
    }

    // Block save if manual mode and not all players verified
    if (mode === "manual" && !allVerified) {
      console.log("[GameStats] blocked: not all verified", {
        verifiedCount,
        nonEmptyRowIndices: nonEmptyRowIndices.length,
      });
      setResult({
        ok: false,
        error:
          "Бүх тоглогчдыг баталгаажуулна уу. Бүртгэлгүй тоглогчдыг эхлээд /players хэсэгт нэмнэ үү.",
      });
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
      console.log("[GameStats] generated CSV:\n", csvText);
      const nonEmptyLines = csvText.split("\n").length - 1;
      console.log("[GameStats] nonEmptyLines:", nonEmptyLines);
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
      console.log("[GameStats] token obtained:", !!token);
      if (!token) throw new Error("Нэвтрэх шаардлагатай");

      const formData = new FormData();
      formData.append("seasonId", seasonId);
      formData.append("gameId", gameId);
      formData.append("teamId", selectedTeamId);
      formData.append("file", fileToSend);

      // Attach root player ID mapping (manual mode only)
      if (mode === "manual") {
        const playerIdMap = buildPlayerIdMap();
        console.log("[GameStats] playerIdMap:", playerIdMap);
        if (Object.keys(playerIdMap).length > 0) {
          formData.append("playerIdMap", JSON.stringify(playerIdMap));
        }
      }

      const url = `${FUNCTIONS_BASE_URL}/uploadGameCsv`;
      console.log("[GameStats] POST ->", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      console.log("[GameStats] response status:", res.status);
      const rawText = await res.text();
      console.log("[GameStats] response body:", rawText);

      let data: UploadResult;
      try {
        const parsed = JSON.parse(rawText);
        data = {
          ...parsed,
          ok: parsed.ok ?? parsed.success ?? false,
        };
      } catch {
        console.error("[GameStats] failed to parse response as JSON:", rawText);
        setResult({
          ok: false,
          error: `Server returned non-JSON (status ${res.status}): ${rawText.slice(0, 200)}`,
        });
        return;
      }
      setResult(data);

      if (data.ok && mode === "csv") {
        setCsvFile(null);
        const fileInput = document.getElementById(
          "gameStatsFileInput",
        ) as HTMLInputElement | null;
        if (fileInput) fileInput.value = "";
      }
    } catch (err: unknown) {
      console.error("[GameStats] fetch error:", err);
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
              <div
                style={{
                  display: "flex",
                  margin: "16px 0 12px",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "2px solid var(--primary-color, #e65100)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    fontSize: 15,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background:
                      mode === "manual"
                        ? "var(--primary-color, #e65100)"
                        : "transparent",
                    color:
                      mode === "manual" ? "#fff" : "var(--text-muted, #aaa)",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  <i className="fas fa-keyboard"></i> ГАРААР ОРУУЛАХ
                </button>
                <button
                  type="button"
                  onClick={() => setMode("csv")}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    fontSize: 15,
                    fontWeight: 700,
                    border: "none",
                    borderLeft: "2px solid var(--primary-color, #e65100)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background:
                      mode === "csv"
                        ? "var(--primary-color, #e65100)"
                        : "transparent",
                    color: mode === "csv" ? "#fff" : "var(--text-muted, #aaa)",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  <i className="fas fa-file-csv"></i> CSV ФАЙЛ
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
                  {/* Load CSV + Check All + verification summary */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* Load CSV into manual rows */}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        document
                          .getElementById("loadCsvForManualInput")
                          ?.click()
                      }
                      style={{ fontSize: 13 }}
                    >
                      <i className="fas fa-file-import"></i> CSV-ээс ачаалах
                    </button>
                    <input
                      type="file"
                      id="loadCsvForManualInput"
                      accept=".csv"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = reader.result as string;
                          const parsed = parseCsvToRows(text);
                          if (parsed.length > 0) {
                            setManualRows(parsed);
                            setVerification(new Map());
                            console.log(
                              `[GameStats] Loaded ${parsed.length} rows from CSV`,
                            );
                          } else {
                            console.warn(
                              "[GameStats] CSV parse returned 0 rows",
                            );
                          }
                        };
                        reader.readAsText(file);
                        // Reset the input so the same file can be re-selected
                        e.target.value = "";
                      }}
                    />

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={checkAllRows}
                      disabled={checkingAll}
                      style={{ fontSize: 13 }}
                    >
                      <i className="fas fa-check-double"></i>{" "}
                      {checkingAll ? "Шалгаж байна..." : "Бүх тоглогч шалгах"}
                    </button>
                    {nonEmptyRowIndices.length > 0 && (
                      <span
                        style={{
                          fontSize: 13,
                          color: allVerified ? "#4CAF50" : "var(--text-muted)",
                        }}
                      >
                        {allVerified ? (
                          <>
                            <i className="fas fa-check-circle"></i>{" "}
                            {verifiedCount}/{nonEmptyRowIndices.length} тоглогч
                            баталгаажсан
                          </>
                        ) : (
                          <>
                            {verifiedCount}/{nonEmptyRowIndices.length} тоглогч
                            баталгаажсан
                            {notFoundCount > 0 && (
                              <span style={{ color: "#ef4444", marginLeft: 8 }}>
                                ({notFoundCount} олдсонгүй)
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <table
                    className="stats-table"
                    style={{ fontSize: 13, minWidth: 960 }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}></th>
                        <th
                          style={{ width: 60, whiteSpace: "nowrap" }}
                          title="Тоглогч шалгах"
                        >
                          Шалгах
                        </th>
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
                      {manualRows.map((row, rowIdx) => {
                        const v = verification.get(rowIdx);
                        const hasJersey = !!row.jerseyNumber?.trim();
                        return (
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
                            {/* Verification cell */}
                            <td
                              style={{
                                textAlign: "center",
                                padding: 2,
                                minWidth: 60,
                              }}
                            >
                              {v?.status === "found" ? (
                                <span
                                  title={`✓ ${v.rootPlayerName ?? ""} (${v.rootPlayerId})`}
                                  style={{
                                    color: "#4CAF50",
                                    fontWeight: "bold",
                                    cursor: "help",
                                  }}
                                >
                                  ✓
                                </span>
                              ) : v?.status === "not_found" ? (
                                <span
                                  title="Тоглогч олдсонгүй — бүртгэнэ үү"
                                  style={{
                                    color: "#ef4444",
                                    fontWeight: "bold",
                                    cursor: "help",
                                  }}
                                >
                                  ✗
                                </span>
                              ) : v?.status === "checking" ? (
                                <span style={{ color: "var(--text-muted)" }}>
                                  …
                                </span>
                              ) : hasJersey ? (
                                <button
                                  type="button"
                                  onClick={() => checkSingleRow(rowIdx)}
                                  style={{
                                    background: "none",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: 4,
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    padding: "2px 6px",
                                  }}
                                  title="Тоглогч шалгах"
                                >
                                  ?
                                </button>
                              ) : null}
                            </td>
                            {MANUAL_COLUMNS.map((col) => (
                              <td key={col.key} style={{ padding: 2 }}>
                                <input
                                  type={col.type}
                                  inputMode={
                                    col.type === "number"
                                      ? "numeric"
                                      : undefined
                                  }
                                  value={row[col.key] ?? ""}
                                  onChange={(e) =>
                                    updateCellWithVerifyReset(
                                      rowIdx,
                                      col.key,
                                      e.target.value,
                                    )
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
                        );
                      })}
                    </tbody>
                  </table>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addRow}
                    >
                      <i className="fas fa-plus"></i> Тоглогч нэмэх
                    </button>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading || (mode === "manual" && !allVerified)}
                >
                  <i className="fas fa-upload"></i>{" "}
                  {uploading
                    ? "Уншиж байна..."
                    : mode === "manual" && !allVerified
                      ? "Бүх тоглогч шалгана уу"
                      : "Статистик хадгалах"}
                </button>
              </div>
              {mode === "manual" &&
                !allVerified &&
                nonEmptyRowIndices.length > 0 && (
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#ef4444",
                      textAlign: "right",
                    }}
                  >
                    <i className="fas fa-info-circle"></i> Бүх тоглогчдыг
                    баталгаажуулсны дараа хадгалах боломжтой.
                    {notFoundCount > 0 &&
                      " Олдоогүй тоглогчдыг эхлээд /admin/players хэсэгт бүртгэнэ үү."}
                  </p>
                )}
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
