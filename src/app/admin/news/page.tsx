"use client";

import { useState, useEffect } from "react";
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

export default function AdminNewsPage() {
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticleWithTeams[]>([]);
  const [formData, setFormData] = useState<NewsFormData>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchNews();
  }, []);

  const fetchTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data as TeamWithAverages[]);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        setNewsArticles(data);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
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

  const handleCoverImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await handleUploadImage(file);
      setFormData((prev) => ({ ...prev, coverImage: url }));
    } catch (error) {
      alert("Зураг байршуулахад алдаа гарлаа");
    }
  };

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
    if (!formData.summary.trim()) {
      alert("Товч тайлбар оруулна уу");
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
        resetForm();
        fetchNews();
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

  const handleEdit = (article: NewsArticleWithTeams) => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Энэ мэдээг устгах уу?")) return;
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNews();
      } else {
        alert("Устгахад алдаа гарлаа");
      }
    } catch (error) {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
  };

  const handleToggleStatus = async (article: NewsArticleWithTeams) => {
    const newStatus = article.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/news/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchNews();
      } else {
        alert("Статус солиход алдаа гарлаа");
      }
    } catch (error) {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-newspaper"></i> Мэдээ удирдах
        </h1>
        <p>Мэдээ нэмэх, засах, устгах</p>
      </div>

      {/* News Form */}
      <section className="admin-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3>
            <i className={`fas fa-${editingId ? "edit" : "plus"}`}></i>{" "}
            {editingId ? "Мэдээ засах" : "Мэдээ нэмэх"}
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              <i className="fas fa-times"></i> Цуцлах
            </button>
          )}
        </div>

        {/* Title & Category Row */}
        <div className="form-row" style={{ marginTop: 16 }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>
              Гарчиг <span style={{ color: "var(--danger-color)" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Тоглолтын тойм: 33 Sparks vs Storm Team"
            />
          </div>
          <div className="form-group">
            <label>Ангилал</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              <option value="highlight">Тоглолтын тойм</option>
              <option value="recap">Тоглолтын дүн</option>
              <option value="announcement">Мэдээлэл</option>
              <option value="interview">Ярилцлага</option>
              <option value="transfer">Шилжилт</option>
            </select>
          </div>
          <div className="form-group">
            <label>Зохиогч</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, author: e.target.value }))
              }
              placeholder="SGL Admin"
            />
          </div>
        </div>

        {/* Summary Row */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>
              Товч тайлбар{" "}
              <span style={{ color: "var(--danger-color)" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.summary}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, summary: e.target.value }))
              }
              placeholder="Тоглолтын гол онцлог мэдээлэл..."
            />
          </div>
        </div>

        {/* Cover Image */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Нүүр зураг</label>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={formData.coverImage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      coverImage: e.target.value,
                    }))
                  }
                  placeholder="https://... эсвэл /images/..."
                />
                <div style={{ marginTop: 8 }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      background: "var(--bg-dark)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <i className="fas fa-upload"></i> Зураг байршуулах
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
              {formData.coverImage && (
                <div
                  style={{
                    width: 120,
                    height: 80,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--border-color)",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={formData.coverImage}
                    alt="Cover"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rich Text Content Editor */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>
              Дэлгэрэнгүй агуулга{" "}
              <span style={{ color: "var(--danger-color)" }}>*</span>
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

        {/* Teams, Featured, Buttons */}
        <div className="form-row" style={{ alignItems: "flex-start" }}>
          <div className="form-group">
            <label>Холбогдох багууд</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              {teams.map((team) => (
                <label
                  key={team.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    background: formData.teamIds.includes(team.id)
                      ? "var(--primary-color)"
                      : "var(--bg-dark)",
                    color: formData.teamIds.includes(team.id)
                      ? "#fff"
                      : "inherit",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                    border: "1px solid var(--border-color)",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.teamIds.includes(team.id)}
                    onChange={() => handleTeamToggle(team.id)}
                    style={{ display: "none" }}
                  />
                  {team.shortName}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
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
              Онцлох мэдээ (Featured)
            </label>
          </div>
          <div
            className="form-group"
            style={{ display: "flex", gap: 8, flexDirection: "column" }}
          >
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving || publishing}
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              {saving ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-save"></i>
              )}{" "}
              Ноорог хадгалах
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || publishing}
              className="btn btn-primary"
              style={{ width: "100%" }}
            >
              {publishing ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}{" "}
              Нийтлэх
            </button>
          </div>
        </div>
      </section>

      {/* Existing News List */}
      {newsArticles.length > 0 && (
        <section className="admin-section">
          <h3>
            <i className="fas fa-list"></i> Нэмсэн мэдээнүүд (
            {newsArticles.length})
          </h3>
          <div className="admin-news-list">
            {newsArticles.map((article) => (
              <div key={article.id} className="admin-news-item">
                <div className="admin-news-info">
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        article.status === "published"
                          ? "var(--success-color, #22c55e)"
                          : "var(--warning-color, #f59e0b)",
                      color: "#fff",
                      marginRight: 6,
                    }}
                  >
                    {article.status === "published" ? "Нийтлэгдсэн" : "Ноорог"}
                  </span>
                  <span className={`news-badge small ${article.category}`}>
                    {CATEGORY_LABELS[article.category] || article.category}
                  </span>
                  <strong>{article.title}</strong>
                  <span
                    style={{ color: "var(--text-muted)", fontSize: "12px" }}
                  >
                    {article.date}
                  </span>
                  {article.featured && (
                    <span
                      style={{
                        color: "var(--warning-color)",
                        fontSize: "11px",
                      }}
                    >
                      <i className="fas fa-star"></i> Featured
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleToggleStatus(article)}
                    className="btn-edit-news"
                    title={
                      article.status === "published"
                        ? "Ноорог болгох"
                        : "Нийтлэх"
                    }
                    style={{
                      background: "none",
                      border: "1px solid var(--border-color)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    <i
                      className={`fas fa-${article.status === "published" ? "eye-slash" : "eye"}`}
                    ></i>
                  </button>
                  <button
                    onClick={() => handleEdit(article)}
                    className="btn-edit-news"
                    title="Засах"
                    style={{
                      background: "none",
                      border: "1px solid var(--border-color)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteNews(article.id)}
                    className="btn-delete-news"
                    title="Устгах"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
