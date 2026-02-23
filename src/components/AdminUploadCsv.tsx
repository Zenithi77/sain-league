"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useActiveSeason,
  useGames,
  useTeams,
  FirestoreGame,
  FirestoreTeam,
} from "@/lib/firestore-hooks";

// ---------------------------------------------------------------------------
// Cloud Function URL – set via env var, falls back to emulator localhost
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminUploadCsv() {
  const { getIdToken } = useAuth();
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { games, loading: gamesLoading } = useGames(seasonId);
  const { teams, loading: teamsLoading } = useTeams(seasonId);

  // State
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  // Build team lookup
  const teamMap = new Map<string, FirestoreTeam>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Selected game object
  const selectedGame: FirestoreGame | undefined = games.find(
    (g) => g.id === selectedGameId,
  );

  // When a game is selected, auto-pick team if game has only two
  useEffect(() => {
    if (selectedGame) {
      // Default to the home team; admin can switch if uploading away stats
      setSelectedTeamId(selectedGame.homeTeamId);
    }
  }, [selectedGame]);

  // -----------------------------------------------------------------------
  // Submit handler
  // -----------------------------------------------------------------------
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!seasonId || !selectedGameId || !selectedTeamId || !csvFile) {
      setResult({
        ok: false,
        error: "Улирал, тоглолт, баг сонгож CSV файл хавсаргана уу.",
      });
      return;
    }

    setUploading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Нэвтрэх шаардлагатай");

      const formData = new FormData();
      formData.append("seasonId", seasonId);
      formData.append("gameId", selectedGameId);
      formData.append("teamId", selectedTeamId);
      formData.append("file", csvFile);

      const res = await fetch(`${FUNCTIONS_BASE_URL}/uploadGameCsv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data: UploadResult = await res.json();
      setResult(data);

      if (data.ok) {
        // Clear file input on success
        setCsvFile(null);
        const fileInput = document.getElementById(
          "csvFileInput",
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

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const loading = seasonLoading || gamesLoading || teamsLoading;

  if (loading) {
    return <p style={{ padding: 20 }}>Ачаалж байна...</p>;
  }

  if (!seasonId) {
    return <p style={{ padding: 20 }}>Идэвхтэй улирал олдсонгүй.</p>;
  }

  return (
    <section className="admin-section">
      <h3>
        <i className="fas fa-file-csv"></i> CSV Статистик оруулах (Cloud
        Function)
      </h3>
      <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
        Тоглолт сонгоно → Баг сонгоно → CSV файл хавсаргана → Upload. Систем
        автоматаар тоглогчдын болон багийн нийлбэр тооцоолно.
      </p>

      <form onSubmit={handleSubmit}>
        {/* ---- Game picker ---- */}
        <div className="form-row">
          <div className="form-group">
            <label>Тоглолт сонгох</label>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="team-select"
              required
            >
              <option value="">-- Тоглолт сонгох --</option>
              {games.map((g) => {
                const home =
                  teamMap.get(g.homeTeamId)?.shortName ?? g.homeTeamId;
                const away =
                  teamMap.get(g.awayTeamId)?.shortName ?? g.awayTeamId;
                const label = `${g.date} | ${home} vs ${away}${
                  g.status === "finished"
                    ? ` (${g.homeScore}-${g.awayScore})`
                    : ""
                }`;
                return (
                  <option key={g.id} value={g.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ---- Team picker (home / away) ---- */}
          <div className="form-group">
            <label>Баг (CSV-д ямар баг?)</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="team-select"
              required
              disabled={!selectedGame}
            >
              <option value="">-- Баг сонгох --</option>
              {selectedGame && (
                <>
                  <option value={selectedGame.homeTeamId}>
                    🏠{" "}
                    {teamMap.get(selectedGame.homeTeamId)?.name ??
                      selectedGame.homeTeamId}
                  </option>
                  <option value={selectedGame.awayTeamId}>
                    ✈️{" "}
                    {teamMap.get(selectedGame.awayTeamId)?.name ??
                      selectedGame.awayTeamId}
                  </option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* ---- CSV file ---- */}
        <div style={{ margin: "15px 0" }}>
          <div
            className="file-upload"
            onClick={() => document.getElementById("csvFileInput")?.click()}
          >
            <i className="fas fa-cloud-upload-alt"></i>
            <p>CSV файлаа энд чирж тавина уу эсвэл дарж сонгоно уу</p>
            <input
              type="file"
              id="csvFileInput"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              style={{ display: "none" }}
            />
          </div>
          {csvFile && (
            <p style={{ marginTop: 10, color: "var(--primary-color)" }}>
              <i className="fas fa-file-csv"></i> {csvFile.name}
            </p>
          )}
        </div>

        {/* ---- Submit ---- */}
        <button type="submit" className="btn btn-primary" disabled={uploading}>
          <i className="fas fa-upload"></i>{" "}
          {uploading ? "Уншиж байна..." : "Upload хийх"}
        </button>
      </form>

      {/* ---- Result display ---- */}
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
              <p>
                Тоглолт: {result.gameId} | Оноо: {result.homeScore} –{" "}
                {result.awayScore}
              </p>
              <p>Тоглогчид бичигдсэн: {result.playersWritten}</p>
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
    </section>
  );
}
