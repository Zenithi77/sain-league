"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TeamWithAverages, NewsArticleWithTeams } from "@/types";
import { getTeams } from "@/lib/firestore";

type TabKey = "all" | "published" | "draft" | "featured";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Бүгд" },
  { key: "published", label: "Нийтлэгдсэн" },
  { key: "draft", label: "Ноорог" },
  { key: "featured", label: "Онцлох" },
];

export default function AdminNewsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticleWithTeams[]>([]);
  const [loading, setLoading] = useState(true);

  // Categories (dynamic from Firestore)
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    {},
  );
  const [catLoading, setCatLoading] = useState(true);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [modalCategories, setModalCategories] = useState<
    Record<string, string>
  >({});
  const [newCatKey, setNewCatKey] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  useEffect(() => {
    fetchTeams();
    fetchNews();
    fetchCategories();
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
    setLoading(true);
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        setNewsArticles(data);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCatLoading(true);
    try {
      const res = await fetch("/api/news/categories");
      if (res.ok) {
        const data = await res.json();
        setCategoryLabels(data.categories || {});
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setCatLoading(false);
    }
  };

  // ── Category modal helpers ──

  const openCatModal = () => {
    setModalCategories({ ...categoryLabels });
    setNewCatKey("");
    setNewCatLabel("");
    setShowCatModal(true);
  };

  const handleAddCategory = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    // Auto-generate key from label (lowercase, no spaces)
    const key =
      newCatKey.trim() ||
      label
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    if (!key) return;
    if (modalCategories[key]) {
      alert("Энэ түлхүүр аль хэдийн байна");
      return;
    }
    setModalCategories((prev) => ({ ...prev, [key]: label }));
    setNewCatKey("");
    setNewCatLabel("");
  };

  const handleRemoveCategory = (key: string) => {
    setModalCategories((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSaveCategories = async () => {
    setCatSaving(true);
    try {
      const res = await fetch("/api/news/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: modalCategories }),
      });
      if (res.ok) {
        setCategoryLabels(modalCategories);
        setShowCatModal(false);
      } else {
        alert("Хадгалахад алдаа гарлаа");
      }
    } catch {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setCatSaving(false);
    }
  };

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let result = [...newsArticles];

    // Tab filter
    switch (activeTab) {
      case "published":
        result = result.filter((a) => a.status === "published");
        break;
      case "draft":
        result = result.filter((a) => a.status === "draft");
        break;
      case "featured":
        result = result.filter((a) => a.featured);
        break;
    }

    // Category filter
    if (filterCategory !== "all") {
      result = result.filter((a) => a.category === filterCategory);
    }

    // Team filter
    if (filterTeam !== "all") {
      result = result.filter((a) => a.teamIds?.includes(filterTeam));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q),
      );
    }

    return result;
  }, [newsArticles, activeTab, filterCategory, filterTeam, searchQuery]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: newsArticles.length,
      published: newsArticles.filter((a) => a.status === "published").length,
      draft: newsArticles.filter((a) => a.status === "draft").length,
      featured: newsArticles.filter((a) => a.featured).length,
    };
  }, [newsArticles]);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ мэдээг устгах уу?")) return;
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNews();
      } else {
        alert("Устгахад алдаа гарлаа");
      }
    } catch {
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
    } catch {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
  };

  const handleToggleFeatured = async (article: NewsArticleWithTeams) => {
    try {
      const res = await fetch(`/api/news/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !article.featured }),
      });
      if (res.ok) {
        fetchNews();
      } else {
        alert("Онцлох статус солиход алдаа гарлаа");
      }
    } catch {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("mn-MN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div
        className="admin-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1>
            <i className="fas fa-newspaper"></i> Мэдээ удирдлага
          </h1>
          <p>Мэдээ нийтлэл үүсгэх, засах, устгах</p>
        </div>
        <Link
          href="/admin/news/add"
          className="btn btn-primary"
          style={{ fontSize: 15, whiteSpace: "nowrap" }}
        >
          <i className="fas fa-plus"></i> Шинэ мэдээ
        </Link>
      </div>

      {/* Tabs */}
      <div className="news-admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`news-admin-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="news-admin-tab-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Toolbar: Search + Filters */}
      <div className="admin-section" style={{ marginBottom: 0 }}>
        <div className="news-admin-toolbar">
          {/* Search */}
          <div className="news-admin-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Гарчгаар хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="news-admin-filter">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Бүх ангилал</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Category manage button */}
          <button
            className="news-admin-action-btn"
            style={{
              width: "auto",
              height: "auto",
              padding: "8px 14px",
              fontSize: 13,
              gap: 6,
              display: "inline-flex",
              alignItems: "center",
            }}
            onClick={openCatModal}
            title="Ангилал удирдах"
          >
            <i className="fas fa-cog"></i> Ангилал
          </button>

          {/* Team filter */}
          <div className="news-admin-filter">
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
            >
              <option value="all">Бүх баг</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result count */}
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            marginTop: 12,
          }}
        >
          {filteredArticles.length} нийтлэл олдлоо
        </div>
      </div>

      {/* Table */}
      <div className="news-admin-table-wrap">
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "var(--text-muted)",
            }}
          >
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
            <p style={{ marginTop: 12 }}>Ачааллаж байна...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "var(--text-muted)",
            }}
          >
            <i
              className="fas fa-newspaper"
              style={{ fontSize: 36, marginBottom: 12, display: "block" }}
            ></i>
            <p>Мэдээ олдсонгүй</p>
          </div>
        ) : (
          <table className="news-admin-table">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>МЭДЭЭ</th>
                <th>СТАТУС</th>
                <th>АНГИЛАЛ</th>
                <th>ОГНОО</th>
                <th style={{ textAlign: "right" }}>ҮЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((article) => (
                <tr key={article.id}>
                  {/* Article info */}
                  <td>
                    <div className="news-admin-article-cell">
                      <div className="news-admin-article-thumb">
                        {article.coverImage ? (
                          <img src={article.coverImage} alt="" />
                        ) : (
                          <div className="news-admin-article-thumb-placeholder">
                            <i className="fas fa-image"></i>
                          </div>
                        )}
                      </div>
                      <div className="news-admin-article-info">
                        <strong>{article.title}</strong>
                        {article.teams && article.teams.length > 0 && (
                          <div className="news-admin-article-teams">
                            {article.teams.map((t) => (
                              <span key={t.id} className="news-admin-team-chip">
                                {t.shortName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <span
                      className={`news-admin-status-badge ${article.status}`}
                    >
                      {article.status === "published"
                        ? "Нийтлэгдсэн"
                        : "Ноорог"}
                    </span>
                  </td>

                  {/* Category */}
                  <td>
                    <span className="news-admin-category-chip">
                      {categoryLabels[article.category] || article.category}
                    </span>
                  </td>

                  {/* Date */}
                  <td>
                    <span style={{ fontSize: 13 }}>
                      {formatDate(article.date)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="news-admin-actions">
                      <button
                        onClick={() =>
                          router.push(`/admin/news/add?edit=${article.id}`)
                        }
                        className="news-admin-action-btn"
                        title="Засах"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(article)}
                        className="news-admin-action-btn"
                        title={
                          article.status === "published"
                            ? "Ноорог болгох"
                            : "Нийтлэх"
                        }
                      >
                        <i
                          className={`fas fa-${article.status === "published" ? "eye-slash" : "eye"}`}
                        ></i>
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(article)}
                        className={`news-admin-action-btn ${article.featured ? "featured-active" : ""}`}
                        title={
                          article.featured ? "Онцлохоос хасах" : "Онцлох болгох"
                        }
                      >
                        <i className={`fas fa-star`}></i>
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="news-admin-action-btn danger"
                        title="Устгах"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Category Management Modal */}
      {showCatModal && (
        <div
          className="cat-modal-overlay"
          onClick={() => setShowCatModal(false)}
        >
          <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="cat-modal-header">
              <div>
                <h3>Ангилал удирдах</h3>
                <p>
                  Эдгээр ангилалууд мэдээний хуудсанд шүүлтүүр болон харагдана.
                </p>
              </div>
              <button
                className="cat-modal-close"
                onClick={() => setShowCatModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Add new */}
            <div className="cat-modal-add-row">
              <input
                type="text"
                placeholder="Шинэ ангилал нэмэх..."
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <button
                className="btn btn-primary"
                style={{ padding: "8px 18px", fontSize: 14 }}
                onClick={handleAddCategory}
                disabled={!newCatLabel.trim()}
              >
                Нэмэх
              </button>
            </div>

            {/* List */}
            <div className="cat-modal-list">
              {Object.entries(modalCategories).map(([key, label]) => (
                <span key={key} className="cat-modal-chip">
                  {label}
                  <button
                    className="cat-modal-chip-remove"
                    onClick={() => handleRemoveCategory(key)}
                    title="Устгах"
                  >
                    ×
                  </button>
                </span>
              ))}
              {Object.keys(modalCategories).length === 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Ангилал байхгүй байна
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="cat-modal-footer">
              <button
                className="btn btn-secondary"
                style={{ padding: "10px 28px", fontSize: 14 }}
                onClick={() => setShowCatModal(false)}
              >
                Цуцлах
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: "10px 28px", fontSize: 14 }}
                onClick={handleSaveCategories}
                disabled={catSaving}
              >
                {catSaving ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  "Хадгалах"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
