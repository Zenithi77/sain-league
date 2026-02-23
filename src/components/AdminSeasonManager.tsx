"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface SeasonDoc {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt?: unknown;
}

export default function AdminSeasonManager() {
  const { userData } = useAuth();
  const [seasons, setSeasons] = useState<SeasonDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!userData || userData.role !== "admin") return null;

  const fetchSeasons = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "seasons"), orderBy("year", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as SeasonDoc
      );
      setSeasons(list);
    } catch (err) {
      console.error("Error fetching seasons:", err);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchSeasons();
  }, []);

  const handleCreateSeason = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!name || !startDate || !endDate) {
      setResult({ ok: false, message: "Бүх талбарыг бөглөнө үү." });
      return;
    }

    setCreating(true);
    try {
      const seasonsRef = collection(db, "seasons");
      const newRef = doc(seasonsRef);

      await setDoc(newRef, {
        name,
        year,
        startDate,
        endDate,
        isActive: false,
        createdAt: serverTimestamp(),
      });

      setResult({ ok: true, message: `"${name}" улирал амжилттай үүслээ!` });
      setName("");
      setStartDate("");
      setEndDate("");
      fetchSeasons();
    } catch (err: unknown) {
      setResult({
        ok: false,
        message: (err as Error).message || "Алдаа гарлаа",
      });
    }
    setCreating(false);
  };

  const handleToggleActive = async (season: SeasonDoc) => {
    const newActiveState = !season.isActive;
    setToggling(season.id);
    setResult(null);

    try {
      // If activating, deactivate all others first
      if (newActiveState) {
        const batch = writeBatch(db);
        for (const s of seasons) {
          if (s.isActive && s.id !== season.id) {
            batch.update(doc(db, "seasons", s.id), {
              isActive: false,
              updatedAt: serverTimestamp(),
            });
          }
        }
        await batch.commit();
      }

      await updateDoc(doc(db, "seasons", season.id), {
        isActive: newActiveState,
        updatedAt: serverTimestamp(),
      });

      setResult({
        ok: true,
        message: newActiveState
          ? `"${season.name}" улирал идэвхжүүллээ!`
          : `"${season.name}" улирал идэвхгүй боллоо.`,
      });
      fetchSeasons();
    } catch (err: unknown) {
      setResult({
        ok: false,
        message: (err as Error).message || "Алдаа гарлаа",
      });
    }
    setToggling(null);
  };

  return (
    <section className="admin-section admin-season-manager">
      <h3>
        <i className="fas fa-trophy"></i> Улирал удирдах
      </h3>
      <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
        Шинэ улирал үүсгэх, идэвхжүүлэх, идэвхгүй болгох. Зөвхөн нэг улирал
        идэвхтэй байж болно.
      </p>

      {/* Existing seasons list */}
      <div className="season-list">
        <h4 style={{ marginBottom: 12, color: "var(--text-light)" }}>
          <i className="fas fa-list"></i> Бүх улирлууд
        </h4>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Ачаалж байна...</p>
        ) : seasons.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            Улирал олдсонгүй. Доор шинэ улирал үүсгэнэ үү.
          </p>
        ) : (
          <div className="season-cards">
            {seasons.map((s) => (
              <div
                key={s.id}
                className={`season-card ${s.isActive ? "active" : ""}`}
              >
                <div className="season-card-info">
                  <div className="season-card-header">
                    <span className="season-card-name">{s.name}</span>
                    {s.isActive && (
                      <span className="season-active-badge">
                        <i className="fas fa-check-circle"></i> Идэвхтэй
                      </span>
                    )}
                  </div>
                  <div className="season-card-meta">
                    <span>
                      <i className="fas fa-calendar"></i> {s.startDate} – {s.endDate}
                    </span>
                    <span>
                      <i className="fas fa-hashtag"></i> {s.year}
                    </span>
                    <span
                      className="season-card-id"
                      title={s.id}
                    >
                      ID: {s.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <button
                  className={`btn ${s.isActive ? "btn-danger" : "btn-success"}`}
                  onClick={() => handleToggleActive(s)}
                  disabled={toggling === s.id}
                >
                  {toggling === s.id ? (
                    "..."
                  ) : s.isActive ? (
                    <>
                      <i className="fas fa-power-off"></i> Идэвхгүй болгох
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play"></i> Идэвхжүүлэх
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create new season form */}
      <div
        style={{
          marginTop: 30,
          paddingTop: 20,
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <h4 style={{ marginBottom: 16, color: "var(--text-light)" }}>
          <i className="fas fa-plus-circle"></i> Шинэ улирал үүсгэх
        </h4>
        <form onSubmit={handleCreateSeason}>
          <div className="form-row">
            <div className="form-group">
              <label>Улирлын нэр</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Жишээ: 2026 Хаврын улирал"
                required
              />
            </div>
            <div className="form-group">
              <label>Жил</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min={2020}
                max={2050}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Эхлэх огноо</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Дуусах огноо</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
                style={{ width: "100%" }}
              >
                <i className="fas fa-plus"></i>{" "}
                {creating ? "Үүсгэж байна..." : "Үүсгэх"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Result */}
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
