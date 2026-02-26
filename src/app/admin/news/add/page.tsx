"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { TeamWithAverages, NewsArticleWithTeams } from "@/types";
import { getTeams } from "@/lib/firestore";

// Dynamically import CKEditor to avoid SSR issues
const BlogEditor = dynamic(() => import("@/components/BlogEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: 400,
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark)",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>Эдитор ачаалж байна...</span>
    </div>
  ),
});

const CATEGORY_LABELS: Record<string, string> = {
  highlight: "Тоглолтын тойм",
  recap: "Тоглолтын дүн",
  announcement: "Мэдээлэл",
  interview: "Ярилцлага",
  transfer: "Шилжилт",
};

interface NewsFormData {
  title: string;
  summary: string;
  contentHtml: string;
  coverImage: string;
  category: string;
  author: string;
  featured: boolean;
  teamIds: string[];
}

const INITIAL_FORM: NewsFormData = {
  title: "",
  summary: "",
  contentHtml: "",
  coverImage: "",
  category: "highlight",
  author: "SGL Admin",
  featured: false,
  teamIds: [],
};

export default function AdminNewsAddPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
  const [formData, setFormData] = useState<NewsFormData>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [coverDragging, setCoverDragging] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTeams();
    if (editId) {
      loadArticle(editId);
    }
  }, [editId]);

  const fetchTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data as TeamWithAverages[]);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const loadArticle = async (id: string) => {
    try {
      const res = await fetch(`/api/news/${id}`);
      if (res.ok) {
        const article: NewsArticleWithTeams = await res.json();
        setEditingId(article.id);
        setFormData({
          title: article.title,
          summary: article.summary,
          contentHtml: article.contentHtml || "",
          coverImage: article.coverImage || "",
          category: article.category,
          author: article.author,
          featured: article.featured,
          teamIds: article.teamIds || [],
        });
      }
    } catch (error) {
      console.error("Error loading article:", error);
    }
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload failed");
    }

    const data = await res.json();
    return data.url;
  };

  const handleCoverImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Зураг 10MB-аас бага байх ёстой");
      return;
    }
    try {
      const url = await handleUploadImage(file);
      setFormData((prev) => ({ ...prev, coverImage: url }));
    } catch (error) {
      alert("Зураг байршуулахад алдаа гарлаа");
    }
  };

  const handleCoverImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleCoverImageFile(file);
  };

  const handleCoverDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setCoverDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) await handleCoverImageFile(file);
    },
    [],
  );

  const handleTeamToggle = (teamId: string) => {
    setFormData((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  const handleSave = async (publish: boolean) => {
    if (!formData.title.trim()) {
      alert("Гарчиг оруулна уу");
      return;
    }
    if (!formData.contentHtml.trim()) {
      alert("Агуулга оруулна уу");
      return;
    }

    if (publish) {
      setPublishing(true);
    } else {
      setSaving(true);
    }

    try {
      const payload = {
        ...formData,
        status: publish ? "published" : "draft",
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/news/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        alert(
          editingId
            ? "Мэдээ амжилттай шинэчлэгдлээ!"
            : publish
              ? "Мэдээ амжилттай нийтлэгдлээ!"
              : "Ноорог амжилттай хадгалагдлаа!",
        );
        router.push("/admin/news");
      } else {
        const data = await res.json();
        alert(data.error || "Алдаа гарлаа");
      }
    } catch (error) {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  /* Estimate reading time from content length */
  const readingMinutes = Math.max(
    1,
    Math.ceil(formData.contentHtml.replace(/<[^>]*>/g, "").length / 900),
  );

  return (
    <div className="admin-page-content blog-add-page">
      {/* ── Header ── */}
      <div className="blog-add-header">
        <button
          className="blog-add-back"
          onClick={() => router.push("/admin/news")}
          title="Буцах"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h1 className="blog-add-title">
            {editingId ? "Блог засах" : "Шинэ блог нэмэх"}
          </h1>
          <p className="blog-add-subtitle">
            {editingId ? "Блог нийтлэл засварлах" : "Шинэ блог нийтлэл үүсгэх"}
          </p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="blog-add-grid">
        {/* ═══ LEFT COLUMN ═══ */}
        <div className="blog-add-main">
          {/* Title */}
          <div className="blog-field">
            <label className="blog-field-label">
              Гарчиг <span className="blog-req">*</span>
            </label>
            <input
              className="blog-field-input"
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Блогийн гарчиг оруулах..."
            />
          </div>

          {/* Summary */}
          <div className="blog-field">
            <label className="blog-field-label">Товч тайлбар</label>
            <input
              className="blog-field-input"
              type="text"
              value={formData.summary}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, summary: e.target.value }))
              }
              placeholder="Нийтлэлийн товч тайлбар..."
            />
          </div>

          {/* Content Editor */}
          <div className="blog-field">
            <label className="blog-field-label">
              Агуулга <span className="blog-req">*</span>
            </label>
            <BlogEditor
              value={formData.contentHtml}
              onChange={(content) =>
                setFormData((prev) => ({ ...prev, contentHtml: content }))
              }
              onImageUpload={handleUploadImage}
            />
          </div>
        </div>

        {/* ═══ RIGHT COLUMN (Sidebar) ═══ */}
        <div className="blog-add-sidebar">
          {/* ── Status Card ── */}
          <div className="blog-sidebar-card">
            <h4 className="blog-sidebar-card-title">Статус</h4>
            <div className="blog-read-time">
              <i className="far fa-clock"></i> Унших хугацаа: ~{readingMinutes}{" "}
              мин
            </div>
            <button
              type="button"
              className="blog-btn-draft"
              onClick={() => handleSave(false)}
              disabled={saving || publishing}
            >
              {saving ? <i className="fas fa-spinner fa-spin"></i> : null}{" "}
              Ноорог хадгалах
            </button>
            <button
              type="button"
              className="blog-btn-publish"
              onClick={() => handleSave(true)}
              disabled={saving || publishing}
            >
              {publishing ? <i className="fas fa-spinner fa-spin"></i> : null}{" "}
              Нийтлэх
            </button>
          </div>

          {/* ── Cover Image Card ── */}
          <div className="blog-sidebar-card">
            <h4 className="blog-sidebar-card-title">Нүүр зураг</h4>
            {formData.coverImage ? (
              <div className="blog-cover-preview">
                <img src={formData.coverImage} alt="Cover" />
                <button
                  className="blog-cover-remove"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, coverImage: "" }))
                  }
                  title="Устгах"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <div
                className={`blog-cover-drop${coverDragging ? " dragging" : ""}`}
                onClick={() => coverInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setCoverDragging(true);
                }}
                onDragLeave={() => setCoverDragging(false)}
                onDrop={handleCoverDrop}
              >
                <i className="far fa-image blog-cover-icon"></i>
                <span className="blog-cover-label">Нүүр зураг оруулах</span>
                <span className="blog-cover-hint">
                  Зураг чирж оруулах эсвэл дарж сонгох
                </span>
                <span className="blog-cover-formats">
                  PNG, JPG, WebP (хамгийн ихдээ 10MB)
                </span>
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleCoverImageChange}
              style={{ display: "none" }}
            />
          </div>

          {/* ── Category Card ── */}
          <div className="blog-sidebar-card">
            <h4 className="blog-sidebar-card-title">Ангилал</h4>
            <select
              className="blog-sidebar-select"
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Author Card ── */}
          <div className="blog-sidebar-card">
            <h4 className="blog-sidebar-card-title">Зохиогч</h4>
            <input
              className="blog-sidebar-input"
              type="text"
              value={formData.author}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, author: e.target.value }))
              }
              placeholder="SGL Admin"
            />
          </div>

          {/* ── Teams Card ── */}
          <div className="blog-sidebar-card">
            <h4 className="blog-sidebar-card-title">Холбогдох багууд</h4>
            <div className="blog-teams-grid">
              {teams.map((team) => {
                const active = formData.teamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    className={`blog-team-chip${active ? " active" : ""}`}
                    onClick={() => handleTeamToggle(team.id)}
                  >
                    {team.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Featured Card ── */}
          <div className="blog-sidebar-card">
            <label className="blog-featured-toggle">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    featured: e.target.checked,
                  }))
                }
              />
              <span className="blog-featured-label">
                <i className="fas fa-star"></i> Онцлох мэдээ
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
