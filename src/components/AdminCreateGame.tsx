"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useActiveSeason,
  useTeams,
  FirestoreTeam,
} from "@/lib/firestore-hooks";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminCreateGame() {
  const { userData } = useAuth();
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { teams, loading: teamsLoading } = useTeams(seasonId);

  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [gameTime, setGameTime] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Only show for admins
  if (!userData || userData.role !== "admin") return null;

  const loading = seasonLoading || teamsLoading;

  if (loading) {
    return (
      <section className="admin-section">
        <p style={{ padding: 20, color: "var(--text-muted)" }}>
          Ачаалж байна...
        </p>
      </section>
    );
  }

  if (!seasonId) {
    return (
      <section className="admin-section">
        <p style={{ padding: 20, color: "var(--text-muted)" }}>
          Идэвхтэй улирал олдсонгүй.
        </p>
      </section>
    );
  }

  const teamMap = new Map<string, FirestoreTeam>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!homeTeamId || !awayTeamId) {
      setResult({ ok: false, message: "Хоёр багаа сонгоно уу." });
      return;
    }

    if (homeTeamId === awayTeamId) {
      setResult({ ok: false, message: "Хоёр өөр баг сонгоно уу." });
      return;
    }

    if (!gameDate) {
      setResult({ ok: false, message: "Тоглолтын огноо оруулна уу." });
      return;
    }

    setCreating(true);
    try {
      const gamesColRef = collection(db, `seasons/${seasonId}/games`);
      const newGameRef = doc(gamesColRef);

      await setDoc(newGameRef, {
        date: gameDate,
        time: gameTime || null,
        location: location || null,
        homeTeamId,
        awayTeamId,
        homeScore: 0,
        awayScore: 0,
        status: "scheduled",
        createdAt: serverTimestamp(),
      });

      const homeName = teamMap.get(homeTeamId)?.shortName || homeTeamId;
      const awayName = teamMap.get(awayTeamId)?.shortName || awayTeamId;

      setResult({
        ok: true,
        message: `${homeName} vs ${awayName} тоглолт амжилттай үүслээ!`,
      });

      // Reset form
      setHomeTeamId("");
      setAwayTeamId("");
      setGameDate("");
      setGameTime("");
      setLocation("");
    } catch (err: unknown) {
      setResult({
        ok: false,
        message: (err as Error).message || "Алдаа гарлаа",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="admin-section admin-create-game">
      <h3>
        <i className="fas fa-plus-circle"></i> Шинэ тоглолт үүсгэх
      </h3>
      <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
        Тоглолтын хуваарьт шинэ тоглолт нэмэх. Firestore-д хадгалагдана.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>
              <i className="fas fa-home"></i> Эзэн баг
            </label>
            <select
              value={homeTeamId}
              onChange={(e) => setHomeTeamId(e.target.value)}
              className="team-select"
              required
            >
              <option value="">-- Баг сонгох --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.shortName})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-plane"></i> Зочин баг
            </label>
            <select
              value={awayTeamId}
              onChange={(e) => setAwayTeamId(e.target.value)}
              className="team-select"
              required
            >
              <option value="">-- Баг сонгох --</option>
              {teams
                .filter((t) => t.id !== homeTeamId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              <i className="fas fa-calendar"></i> Огноо
            </label>
            <input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-clock"></i> Цаг (заавал биш)
            </label>
            <input
              type="time"
              value={gameTime}
              onChange={(e) => setGameTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-map-marker-alt"></i> Байршил (заавал биш)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Жишээ: Спорт ордон"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating}
          style={{ marginTop: 10 }}
        >
          <i className="fas fa-plus"></i>{" "}
          {creating ? "Үүсгэж байна..." : "Тоглолт үүсгэх"}
        </button>
      </form>

      {result && (
        <div
          className="admin-result"
          style={{
            marginTop: 20,
            padding: 15,
            background: "var(--bg-card)",
            borderRadius: 10,
            borderLeft: `4px solid ${result.ok ? "#4CAF50" : "#ef4444"}`,
          }}
        >
          <p
            style={{
              color: result.ok ? "#4CAF50" : "#ef4444",
              fontWeight: "bold",
            }}
          >
            <i
              className={`fas ${result.ok ? "fa-check-circle" : "fa-exclamation-circle"}`}
            ></i>{" "}
            {result.message}
          </p>
        </div>
      )}
    </section>
  );
}
