"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { Team, CoachType } from "@/types";
import { getTeams, getCoach, updateCoach } from "@/lib/firestore";

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 51 }, (_, i) => CURRENT_YEAR - 20 - i);

const COACH_TYPES: { value: CoachType; label: string }[] = [
  { value: "HeadCoach", label: "Ерөнхий дасгалжуулагч" },
  { value: "AssociateCoach", label: "Туслах дасгалжуулагч" },
  { value: "AssistantCoach", label: "Нэмэлт дасгалжуулагч" },
];

const COACH_TYPE_COLORS: Record<CoachType, string> = {
  HeadCoach: "#F15F22",
  AssociateCoach: "#0072bc",
  AssistantCoach: "#16a34a",
};

export default function AdminCoachesEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedCoachType, setSelectedCoachType] = useState<CoachType | "">(
    "",
  );
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [school, setSchool] = useState("");
  const [description, setDescription] = useState("");
  const [birthYear, setBirthYear] = useState<number | "">("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getCoach(id), getTeams()])
      .then(([coachData, teamsData]) => {
        if (!coachData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setFirstName(coachData.firstName || "");
        setLastName(coachData.lastName || "");
        setSelectedTeamId(coachData.teamId || "");
        setSelectedCoachType(coachData.coachType || "");
        setSchool(coachData.school || "");
        setDescription(coachData.description || "");
        setBirthYear(coachData.birthYear || "");
        if (coachData.image) {
          setImageUrl(coachData.image);
          setImagePreview(coachData.image);
        }
        setTeams(teamsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

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
      const filename = `coaches/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Зураг upload хийхэд алдаа гарлаа");
      setImagePreview(imageUrl);
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

  const handleEditCoach = async (e: FormEvent) => {
    e.preventDefault();

    const rawFirst = firstName.trim();
    const rawLast = lastName.trim();

    if (!rawFirst && !rawLast) {
      alert("Дасгалжуулагчийн нэр оруулна уу");
      return;
    }
    if (!selectedTeamId) {
      alert("Баг сонгоно уу");
      return;
    }
    if (!selectedCoachType) {
      alert("Дасгалжуулагчийн төрөл сонгоно уу");
      return;
    }
    if (uploading) {
      alert("Зураг upload дуусахыг хүлээнэ үү");
      return;
    }

    setSaving(true);
    try {
      await updateCoach(id, {
        firstName: rawFirst,
        lastName: rawLast,
        teamId: selectedTeamId,
        coachType: selectedCoachType,
        school: school.trim(),
        description: description.trim(),
        birthYear: Number(birthYear) || 0,
        image: imageUrl || undefined,
      });
      router.push("/admin/coaches");
    } catch (error) {
      console.error("Error updating coach:", error);
      alert("Дасгалжуулагч шинэчлэхэд алдаа гарлаа");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-content">
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
          <p style={{ marginTop: 12 }}>Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="admin-page-content">
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <i
            className="fas fa-exclamation-triangle"
            style={{ fontSize: 24 }}
          ></i>
          <p style={{ marginTop: 12 }}>Дасгалжуулагч олдсонгүй</p>
          <Link
            href="/admin/coaches"
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
          >
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-content">
      {/* Page header */}
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/admin/coaches"
            className="btn btn-secondary"
            style={{ padding: "8px 14px", borderRadius: 10 }}
          >
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              Дасгалжуулагч засварлах
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              Дасгалжуулагчийн мэдээллийг засварлана уу
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleEditCoach}>
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
                ></div>
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

            {/* Live preview */}
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
                {selectedCoachType && (
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      padding: "2px 10px",
                      borderRadius: 6,
                      display: "inline-block",
                      background: `${COACH_TYPE_COLORS[selectedCoachType]}20`,
                      color: COACH_TYPE_COLORS[selectedCoachType],
                      fontWeight: 700,
                    }}
                  >
                    {
                      COACH_TYPES.find((ct) => ct.value === selectedCoachType)
                        ?.label
                    }
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
                    className="fas fa-user-tie"
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
                    Дасгалжуулагчийн төрөл{" "}
                    <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
                  <select
                    name="coachType"
                    required
                    value={selectedCoachType}
                    onChange={(e) =>
                      setSelectedCoachType(e.target.value as CoachType)
                    }
                  >
                    <option value="">Төрөл сонгох</option>
                    {COACH_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Сургууль</label>
                  <input
                    type="text"
                    name="school"
                    placeholder="Сургуулийн нэр"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Төрсөн он</label>
                  <select
                    name="birthYear"
                    value={birthYear}
                    onChange={(e) =>
                      setBirthYear(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">Он сонгох</option>
                    {BIRTH_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Тайлбар</label>
                  <textarea
                    name="description"
                    placeholder="Дасгалжуулагчийн тухай товч мэдээлэл..."
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      minHeight: 100,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <Link
                href="/admin/coaches"
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
                    <i className="fas fa-save" style={{ marginRight: 6 }}></i>
                    Хадгалах
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
