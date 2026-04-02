"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { Team, Player } from "@/types";
import { getTeams, createPlayer } from "@/lib/firestore";

const CURRENT_YEAR = new Date().getFullYear();
const BORN_YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - 13 - i);

const POSITIONS = [
  { value: "PG", label: "PG", sub: "Point Guard" },
  { value: "SG", label: "SG", sub: "Shooting Guard" },
  { value: "SF", label: "SF", sub: "Small Forward" },
  { value: "PF", label: "PF", sub: "Power Forward" },
  { value: "C", label: "C", sub: "Center" },
];

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?"
  );
}

export default function AdminPlayersAddPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    getTeams()
      .then((data) => setTeams(data))
      .catch((err) => console.error("Error fetching teams:", err));
  }, []);

  const uploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Зургийн хэмжээ 5MB-с хэтрэхгүй байх ёстой");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Зөвхөн JPEG, PNG, WebP зөвшөөрөгдөнө");
      return;
    }

    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `players/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Зураг upload хийхэд алдаа гарлаа");
      setImagePreview("");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  };

  const handleAddPlayer = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const rawFirst = ((formData.get("firstName") as string) || "").trim();
    const rawLast = ((formData.get("lastName") as string) || "").trim();
    const playerName = [rawLast, rawFirst].filter(Boolean).join(" ");
    const teamId = ((formData.get("teamId") as string) || "").trim();
    const number = parseInt(formData.get("number") as string) || 0;
    const position = ((formData.get("position") as string) || "").trim();
    const height = ((formData.get("height") as string) || "").trim();
    const weight = ((formData.get("weight") as string) || "").trim();
    const bornYear = parseInt(formData.get("bornYear") as string) || 0;
    const college = ((formData.get("college") as string) || "").trim();

    if (!rawFirst && !rawLast) {
      alert("Тоглогчийн нэр оруулна уу");
      return;
    }
    if (!teamId) {
      alert("Баг сонгоно уу");
      return;
    }
    if (!position) {
      alert("Байрлал сонгоно уу");
      return;
    }
    if (uploading) {
      alert("Зураг upload дуусахыг хүлээнэ үү");
      return;
    }

    setSaving(true);
    try {
      const playerData: Omit<Player, "id"> = {
        name: playerName,
        teamId,
        number,
        position,
        height,
        weight,
        age: bornYear,
        image: imageUrl,
        college: college || undefined,
        stats: {
          gamesPlayed: 0,
          minutesPlayed: 0,
          totalPoints: 0,
          totalRebounds: 0,
          totalAssists: 0,
          totalSteals: 0,
          totalBlocks: 0,
          totalTurnovers: 0,
          totalFouls: 0,
          fieldGoalsMade: 0,
          fieldGoalsAttempted: 0,
          threePointersMade: 0,
          threePointersAttempted: 0,
          freeThrowsMade: 0,
          freeThrowsAttempted: 0,
        },
      };

      await createPlayer(playerData);
      router.push("/admin/players");
    } catch (error) {
      console.error("Error creating player:", error);
      alert("Тоглогч нэмэхэд алдаа гарлаа");
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-content">
      {/* Page header */}
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/admin/players"
            className="btn btn-secondary"
            style={{ padding: "8px 14px", borderRadius: 10 }}
          >
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              Шинэ тоглогч нэмэх
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              Тоглогчийн бүрэн мэдээллийг оруулна уу
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleAddPlayer}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── Left: Photo card ── */}
          <div
            className="admin-section"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Avatar / drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                width: 160,
                height: 160,
                borderRadius: "50%",
                border: dragOver
                  ? "2px dashed var(--primary-color)"
                  : imagePreview
                    ? "3px solid var(--primary-color)"
                    : "2px dashed var(--border-color)",
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                background: "var(--bg-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border 0.2s",
                flexShrink: 0,
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    padding: 12,
                  }}
                >
                  <i
                    className="fas fa-camera"
                    style={{ fontSize: 28, display: "block", marginBottom: 8 }}
                  ></i>
                  <span style={{ fontSize: 12 }}>Зураг оруулах</span>
                </div>
              )}
              {/* Upload overlay */}
              {uploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                  }}
                >
                  <i
                    className="fas fa-spinner fa-spin"
                    style={{ color: "#fff", fontSize: 22 }}
                  ></i>
                </div>
              )}
              {/* Hover edit overlay */}
              {imagePreview && !uploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.4)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0)")
                  }
                >
                  <i
                    className="fas fa-pencil-alt"
                    style={{ color: "#fff", fontSize: 18, opacity: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  ></i>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            <div style={{ textAlign: "center" }}>
              <p
                style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}
              >
                JPEG, PNG, WebP · Макс 5MB
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Дарж эсвэл чирж оруулах
              </p>
            </div>

            {imagePreview && (
              <button
                type="button"
                onClick={() => {
                  setImagePreview("");
                  setImageUrl("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                style={{
                  background: "none",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <i className="fas fa-times" style={{ marginRight: 6 }}></i>
                Устгах
              </button>
            )}

            {/* Live preview name + position */}
            {(firstName || lastName) && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "var(--bg-dark)",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {[lastName, firstName].filter(Boolean).join(" ")}
                </div>
                {selectedPosition && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {selectedPosition}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Form fields ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Section: Үндсэн мэдээлэл */}
            <div className="admin-section" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(241,95,34,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className="fas fa-user"
                    style={{ color: "var(--primary-color)", fontSize: 14 }}
                  ></i>
                </div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  Үндсэн мэдээлэл
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div className="form-group">
                  <label>
                    Овог{" "}
                    <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    placeholder="Овог"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Нэр <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    placeholder="Нэр"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Баг <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
                  <select name="teamId" required>
                    <option value="">Баг сонгох</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    Байрлал{" "}
                    <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
                  <select
                    name="position"
                    required
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                  >
                    <option value="">Байрлал сонгох</option>
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label} – {p.sub}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    Мөрний дугаар{" "}
                    <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="number"
                    required
                    placeholder="00"
                    min={0}
                    max={99}
                    style={{
                      fontWeight: 700,
                      fontSize: 18,
                      textAlign: "center",
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Сургууль</label>
                  <input
                    type="text"
                    name="college"
                    placeholder="Сургуулийн нэр"
                  />
                </div>
              </div>
            </div>

            {/* Section: Биеийн үзүүлэлт */}
            <div className="admin-section" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(0,114,188,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className="fas fa-ruler-vertical"
                    style={{ color: "#0072bc", fontSize: 14 }}
                  ></i>
                </div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  Биеийн үзүүлэлт
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                }}
              >
                <div className="form-group">
                  <label>Өндөр</label>
                  <input type="text" name="height" placeholder="175 см" />
                </div>
                <div className="form-group">
                  <label>Жин</label>
                  <input type="text" name="weight" placeholder="65 кг" />
                </div>
                <div className="form-group">
                  <label>Төрсөн он</label>
                  <select name="bornYear">
                    <option value="">Он сонгох</option>
                    {BORN_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <Link
                href="/admin/players"
                className="btn btn-secondary"
                style={{ minWidth: 120 }}
              >
                <i className="fas fa-times" style={{ marginRight: 6 }}></i>
                Цуцлах
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ minWidth: 160 }}
                disabled={saving || uploading}
              >
                {saving ? (
                  <>
                    <i
                      className="fas fa-spinner fa-spin"
                      style={{ marginRight: 6 }}
                    ></i>
                    Хадгалж байна...
                  </>
                ) : (
                  <>
                    <i
                      className="fas fa-user-plus"
                      style={{ marginRight: 6 }}
                    ></i>
                    Тоглогч нэмэх
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
