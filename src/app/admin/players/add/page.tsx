"use client";

import { useState, useEffect, useCallback, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { Team, Player } from "@/types";
import { getTeams, createPlayer } from "@/lib/firestore";
import { createAvatarTask } from "@/utils/api";
import { useAvatarTask } from "@/hooks/useAvatarTask";
import { useFormPersist } from "@/hooks/useFormPersist";
import UnsavedChangesModal from "@/components/UnsavedChangesModal";

const Avatar3DViewer = dynamic(() => import("@/components/Avatar3DViewer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a2e",
        borderRadius: 12,
      }}
    >
      <i
        className="fas fa-spinner fa-spin"
        style={{ color: "#fff", fontSize: 24 }}
      ></i>
    </div>
  ),
});

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
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<number | "">("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bornYear, setBornYear] = useState<number | "">("");
  const [college, setCollege] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // ── 3D Avatar (ImageTo3D) state ──
  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const [bodyImageUrl, setBodyImageUrl] = useState("");
  const [bodyImagePreview, setBodyImagePreview] = useState("");
  const [bodyImageUploading, setBodyImageUploading] = useState(false);
  const [bodyDragOver, setBodyDragOver] = useState(false);
  const [avatarDocId, setAvatarDocId] = useState<string | null>(null);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const { task: avatarTask } = useAvatarTask(avatarDocId);

  // ── Unsaved changes modal ──
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ── Form persistence ──
  const formState = {
    firstName,
    lastName,
    selectedPosition,
    selectedTeamId,
    selectedNumber,
    height,
    weight,
    bornYear,
    college,
    imageUrl,
    imagePreview,
    bodyImageUrl,
    bodyImagePreview,
    avatarDocId,
  };
  const isDirty = !!(
    firstName ||
    lastName ||
    selectedPosition ||
    selectedTeamId ||
    imageUrl ||
    bodyImageUrl
  );

  const { clearDraft } = useFormPersist(
    "player-add-draft",
    formState,
    useCallback((saved: Partial<typeof formState>) => {
      if (saved.firstName !== undefined) setFirstName(saved.firstName);
      if (saved.lastName !== undefined) setLastName(saved.lastName);
      if (saved.selectedPosition !== undefined)
        setSelectedPosition(saved.selectedPosition);
      if (saved.selectedTeamId !== undefined)
        setSelectedTeamId(saved.selectedTeamId);
      if (saved.selectedNumber !== undefined)
        setSelectedNumber(saved.selectedNumber);
      if (saved.height !== undefined) setHeight(saved.height);
      if (saved.weight !== undefined) setWeight(saved.weight);
      if (saved.bornYear !== undefined) setBornYear(saved.bornYear);
      if (saved.college !== undefined) setCollege(saved.college);
      if (saved.imageUrl) {
        setImageUrl(saved.imageUrl);
        setImagePreview(saved.imageUrl);
      }
      if (saved.bodyImageUrl) {
        setBodyImageUrl(saved.bodyImageUrl);
        setBodyImagePreview(saved.bodyImageUrl);
      }
      if (saved.avatarDocId !== undefined) setAvatarDocId(saved.avatarDocId);
    }, []),
    isDirty,
  );

  const handleCancelClick = (e: React.MouseEvent, href: string) => {
    if (isDirty) {
      e.preventDefault();
      setPendingNavigate(href);
      setShowUnsavedModal(true);
    }
  };

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

  // ── 3D Avatar: body image upload ──
  const uploadBodyImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("Зургийн хэмжээ 10MB-с хэтрэхгүй байх ёстой");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Зөвхөн JPEG, PNG, WebP зөвшөөрөгдөнө");
      return;
    }

    setBodyImagePreview(URL.createObjectURL(file));
    setBodyImageUploading(true);
    setAvatarError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `avatars/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setBodyImageUrl(url);
    } catch (err) {
      console.error("Body image upload failed:", err);
      alert("Зураг upload хийхэд алдаа гарлаа");
      setBodyImagePreview("");
    } finally {
      setBodyImageUploading(false);
    }
  };

  const handleBodyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadBodyImage(file);
  };

  const handleBodyDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBodyDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadBodyImage(file);
  };

  const handleGenerateAvatar = async () => {
    if (!bodyImageUrl) {
      alert("Эхлээд бүтэн биеийн зургийг оруулна уу");
      return;
    }
    setGeneratingAvatar(true);
    setAvatarError(null);
    try {
      const tempPlayerId = `tmp-${Date.now()}`;
      const result = await createAvatarTask({
        playerId: tempPlayerId,
        imageUrl: bodyImageUrl,
      });
      setAvatarDocId(result.docId);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "3D загвар үүсгэхэд алдаа гарлаа";
      setAvatarError(message);
      console.error("Avatar task creation failed:", err);
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const savePlayer = async () => {
    const rawFirst = firstName.trim();
    const rawLast = lastName.trim();
    const playerName = [rawLast, rawFirst].filter(Boolean).join(" ");

    if (!rawFirst && !rawLast) {
      alert("Тоглогчийн нэр оруулна уу");
      return false;
    }
    if (!selectedTeamId) {
      alert("Баг сонгоно уу");
      return false;
    }
    if (!selectedPosition) {
      alert("Байрлал сонгоно уу");
      return false;
    }
    if (uploading || bodyImageUploading) {
      alert("Зураг upload дуусахыг хүлээнэ үү");
      return false;
    }

    setSaving(true);
    try {
      const glbUrl =
        avatarTask?.status === "SUCCEEDED" && avatarTask.modelUrls?.glb
          ? avatarTask.modelUrls.glb
          : undefined;

      const playerData: Omit<Player, "id"> = {
        name: playerName,
        teamId: selectedTeamId,
        number: Number(selectedNumber) || 0,
        position: selectedPosition,
        height: height.trim(),
        weight: weight.trim(),
        age: Number(bornYear) || 0,
        image: imageUrl,
        college: college.trim() || undefined,
        modelUrl: glbUrl,
        avatarTaskDocId: avatarDocId || undefined,
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
      clearDraft();
      router.push("/admin/players");
      return true;
    } catch (error) {
      console.error("Error creating player:", error);
      alert("Тоглогч нэмэхэд алдаа гарлаа");
      setSaving(false);
      return false;
    }
  };

  const handleAddPlayer = async (e: FormEvent) => {
    e.preventDefault();
    await savePlayer();
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
            onClick={(e) => handleCancelClick(e, "/admin/players")}
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

      <form ref={formRef} onSubmit={handleAddPlayer}>
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
                  <select
                    name="teamId"
                    required
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
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
                    value={selectedNumber}
                    onChange={(e) =>
                      setSelectedNumber(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
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
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
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
                  <input
                    type="text"
                    name="height"
                    placeholder="175 см"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Жин</label>
                  <input
                    type="text"
                    name="weight"
                    placeholder="65 кг"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Төрсөн он</label>
                  <select
                    name="bornYear"
                    value={bornYear}
                    onChange={(e) =>
                      setBornYear(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  >
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

            {/* Section: 3D Загвар (ImageTo3D) */}
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
                    background: "rgba(139,92,246,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className="fas fa-cube"
                    style={{ color: "#8b5cf6", fontSize: 14 }}
                  ></i>
                </div>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    3D Загвар (ImageTo3D)
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    Бүтэн биеийн зургаар 3D загвар үүсгэх
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  minHeight: 240,
                }}
              >
                {/* Left: body image upload */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div
                    onClick={() => bodyFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setBodyDragOver(true);
                    }}
                    onDragLeave={() => setBodyDragOver(false)}
                    onDrop={handleBodyDrop}
                    style={{
                      flex: 1,
                      minHeight: 200,
                      border: bodyDragOver
                        ? "2px dashed #8b5cf6"
                        : bodyImagePreview
                          ? "2px solid var(--border-color)"
                          : "2px dashed var(--border-color)",
                      borderRadius: 12,
                      cursor: "pointer",
                      position: "relative",
                      background: "var(--bg-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      transition: "border 0.2s",
                    }}
                  >
                    {bodyImagePreview ? (
                      <img
                        src={bodyImagePreview}
                        alt="body preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          padding: 20,
                        }}
                      >
                        <i
                          className="fas fa-person"
                          style={{
                            fontSize: 36,
                            display: "block",
                            marginBottom: 10,
                          }}
                        ></i>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          Бүтэн биеийн зураг
                        </span>
                        <br />
                        <span style={{ fontSize: 11 }}>
                          Дарж эсвэл чирж оруулах
                        </span>
                        <br />
                        <span
                          style={{ fontSize: 10, color: "var(--text-muted)" }}
                        >
                          JPEG, PNG, WebP · Макс 10MB
                        </span>
                      </div>
                    )}
                    {bodyImageUploading && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i
                          className="fas fa-spinner fa-spin"
                          style={{ color: "#fff", fontSize: 22 }}
                        ></i>
                      </div>
                    )}
                  </div>

                  <input
                    ref={bodyFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleBodyFileChange}
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    {bodyImagePreview && !avatarDocId && (
                      <button
                        type="button"
                        onClick={() => {
                          setBodyImagePreview("");
                          setBodyImageUrl("");
                          setAvatarError(null);
                          if (bodyFileInputRef.current)
                            bodyFileInputRef.current.value = "";
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
                        <i
                          className="fas fa-times"
                          style={{ marginRight: 6 }}
                        ></i>
                        Устгах
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateAvatar}
                      disabled={
                        !bodyImageUrl ||
                        bodyImageUploading ||
                        generatingAvatar ||
                        (!!avatarTask &&
                          avatarTask.status !== "FAILED" &&
                          avatarTask.status !== "EXPIRED" &&
                          avatarTask.status !== "error")
                      }
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: 10,
                        border: "none",
                        background:
                          bodyImageUrl && !generatingAvatar
                            ? "#8b5cf6"
                            : "var(--bg-dark)",
                        color:
                          bodyImageUrl && !generatingAvatar
                            ? "#fff"
                            : "var(--text-muted)",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor:
                          bodyImageUrl && !generatingAvatar
                            ? "pointer"
                            : "not-allowed",
                        transition: "all 0.2s",
                      }}
                    >
                      {generatingAvatar ? (
                        <>
                          <i
                            className="fas fa-spinner fa-spin"
                            style={{ marginRight: 6 }}
                          ></i>
                          Илгээж байна...
                        </>
                      ) : (
                        <>
                          <i
                            className="fas fa-cube"
                            style={{ marginRight: 6 }}
                          ></i>
                          3D Загвар үүсгэх
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right: status / 3D viewer */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 200,
                    borderRadius: 12,
                    background: "var(--bg-dark)",
                    padding: 20,
                  }}
                >
                  {!avatarDocId && !avatarError && !generatingAvatar && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      <i
                        className="fas fa-cube"
                        style={{
                          fontSize: 32,
                          marginBottom: 10,
                          display: "block",
                          opacity: 0.3,
                        }}
                      ></i>
                      <p style={{ fontSize: 13, margin: 0 }}>
                        Бүтэн биеийн зураг оруулж 3D загвар үүсгэнэ үү
                      </p>
                    </div>
                  )}

                  {avatarError && !avatarDocId && (
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 16px",
                          borderRadius: 8,
                          background: "rgba(239,68,68,0.12)",
                          color: "#ef4444",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        <i className="fas fa-exclamation-triangle"></i>
                        {avatarError}
                      </div>
                    </div>
                  )}

                  {(generatingAvatar ||
                    (avatarDocId &&
                      (!avatarTask ||
                        avatarTask.status === "queued" ||
                        avatarTask.status === "pending"))) && (
                    <div style={{ textAlign: "center" }}>
                      <i
                        className="fas fa-spinner fa-spin"
                        style={{
                          fontSize: 28,
                          color: "#8b5cf6",
                          marginBottom: 12,
                          display: "block",
                        }}
                      ></i>
                      <p
                        style={{
                          fontSize: 13,
                          margin: 0,
                          color: "var(--text-muted)",
                        }}
                      >
                        {generatingAvatar
                          ? "Илгээж байна..."
                          : "Дараалалд орсон... Түр хүлээнэ үү"}
                      </p>
                      {avatarTask && (
                        <p
                          style={{
                            fontSize: 11,
                            margin: "4px 0 0",
                            color: "var(--text-muted)",
                            opacity: 0.6,
                          }}
                        >
                          Статус: {avatarTask.status}
                        </p>
                      )}
                    </div>
                  )}

                  {avatarTask && avatarTask.status === "IN_PROGRESS" && (
                    <div style={{ textAlign: "center", width: "100%" }}>
                      <i
                        className="fas fa-cog fa-spin"
                        style={{
                          fontSize: 28,
                          color: "#8b5cf6",
                          marginBottom: 12,
                          display: "block",
                        }}
                      ></i>
                      <p
                        style={{
                          fontSize: 13,
                          margin: "0 0 12px",
                          fontWeight: 500,
                        }}
                      >
                        3D загвар үүсгэж байна...
                      </p>
                      <div
                        style={{
                          width: "100%",
                          height: 8,
                          borderRadius: 4,
                          background: "rgba(139,92,246,0.15)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${avatarTask.progress ?? 0}%`,
                            height: "100%",
                            borderRadius: 4,
                            background:
                              "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          margin: "8px 0 0",
                          color: "var(--text-muted)",
                        }}
                      >
                        {avatarTask.progress ?? 0}%
                      </p>
                    </div>
                  )}

                  {avatarTask &&
                    avatarTask.status === "SUCCEEDED" &&
                    avatarTask.modelUrls?.glb && (
                      <div style={{ width: "100%", textAlign: "center" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 14px",
                            borderRadius: 8,
                            background: "rgba(34,197,94,0.12)",
                            color: "#22c55e",
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 12,
                          }}
                        >
                          <i className="fas fa-check-circle"></i>
                          3D загвар амжилттай үүслээ
                        </div>
                        <Avatar3DViewer
                          glbUrl={avatarTask.modelUrls.glb}
                          height={560}
                        />
                      </div>
                    )}

                  {avatarTask &&
                    (avatarTask.status === "FAILED" ||
                      avatarTask.status === "error") && (
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 16px",
                            borderRadius: 8,
                            background: "rgba(239,68,68,0.12)",
                            color: "#ef4444",
                            fontSize: 13,
                            fontWeight: 500,
                            marginBottom: 8,
                          }}
                        >
                          <i className="fas fa-times-circle"></i>
                          3D загвар үүсгэж чадсангүй
                        </div>
                        {avatarTask.taskError && (
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              margin: "8px 0 0",
                            }}
                          >
                            {typeof avatarTask.taskError === "string"
                              ? avatarTask.taskError
                              : avatarTask.taskError?.message ||
                                "Unknown error"}
                          </p>
                        )}
                      </div>
                    )}

                  {avatarTask && avatarTask.status === "EXPIRED" && (
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 16px",
                          borderRadius: 8,
                          background: "rgba(234,179,8,0.12)",
                          color: "#eab308",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        <i className="fas fa-clock"></i>
                        Хугацаа дууссан
                      </div>
                    </div>
                  )}
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
                onClick={(e) => handleCancelClick(e, "/admin/players")}
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

      {showUnsavedModal && (
        <UnsavedChangesModal
          saving={saving}
          onSave={async () => {
            const ok = await savePlayer();
            if (ok) {
              setShowUnsavedModal(false);
            }
          }}
          onDiscard={() => {
            clearDraft();
            setShowUnsavedModal(false);
            if (pendingNavigate) router.push(pendingNavigate);
          }}
          onCancel={() => {
            setShowUnsavedModal(false);
            setPendingNavigate(null);
          }}
        />
      )}
    </div>
  );
}
