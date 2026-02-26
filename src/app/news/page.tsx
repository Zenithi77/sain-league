"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { NewsArticleWithTeams } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  highlight: "Тоглолтын тойм",
  recap: "Тоглолтын дүн",
  announcement: "Мэдээлэл",
  interview: "Ярилцлага",
  transfer: "Шилжилт",
};

const CATEGORY_ICONS: Record<string, string> = {
  highlight: "fas fa-fire",
  recap: "fas fa-clipboard-list",
  announcement: "fas fa-bullhorn",
  interview: "fas fa-microphone",
  transfer: "fas fa-exchange-alt",
};

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticleWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/news?status=published");
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles =
    activeCategory === "all"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const featuredArticles = articles.filter((a) => a.featured);
  const regularArticles = filteredArticles.filter(
    (a) => !a.featured || activeCategory !== "all",
  );

  if (loading) {
    return (
      <main className="main-content">
        <div className="schedule-loading">
          <div className="loading-spinner"></div>
          <p>Мэдээ ачааллаж байна...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="page-header">
        <h1>
          <i className="fas fa-newspaper"></i> Мэдээ & Тойм
        </h1>
        <p>Тоглолтын тойм, highlight, ярилцлага болон бусад мэдээллүүд</p>
      </div>

      {/* Category Filter */}
      <div className="news-categories">
        <button
          className={`news-cat-btn ${activeCategory === "all" ? "active" : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          <i className="fas fa-th-large"></i> Бүгд
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`news-cat-btn ${activeCategory === key ? "active" : ""}`}
            onClick={() => setActiveCategory(key)}
          >
            <i className={CATEGORY_ICONS[key]}></i> {label}
          </button>
        ))}
      </div>

      {/* Featured Hero Section — only show on "all" tab */}
      {activeCategory === "all" && featuredArticles.length > 0 && (
        <section className="news-featured-section">
          <div className="news-featured-grid">
            {featuredArticles.slice(0, 1).map((article) => (
              <Link
                href={`/news/${article.id}`}
                key={article.id}
                className="news-hero-card"
              >
                <div className="news-hero-image">
                  {article.coverImage ? (
                    <img src={article.coverImage} alt={article.title} />
                  ) : (
                    <div className="news-hero-placeholder">
                      <i
                        className={
                          CATEGORY_ICONS[article.category] || "fas fa-newspaper"
                        }
                      ></i>
                    </div>
                  )}
                  <div className="news-hero-overlay">
                    <span className={`news-badge ${article.category}`}>
                      <i className={CATEGORY_ICONS[article.category]}></i>
                      {CATEGORY_LABELS[article.category]}
                    </span>
                    <h2>{article.title}</h2>
                    <p>{article.summary}</p>
                    <div className="news-hero-meta">
                      <span>
                        <i className="fas fa-calendar"></i> {article.date}
                      </span>
                      <span>
                        <i className="fas fa-user"></i> {article.author}
                      </span>
                      {article.teams?.length > 0 && (
                        <span className="news-hero-teams">
                          {article.teams.map((t) => t.shortName).join(" vs ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {featuredArticles.length > 1 && (
              <div className="news-featured-sidebar">
                {featuredArticles.slice(1, 4).map((article) => (
                  <Link
                    href={`/news/${article.id}`}
                    key={article.id}
                    className="news-sidebar-card"
                  >
                    <div className="news-sidebar-image">
                      {article.coverImage ? (
                        <img src={article.coverImage} alt={article.title} />
                      ) : (
                        <div className="news-sidebar-placeholder">
                          <i
                            className={
                              CATEGORY_ICONS[article.category] ||
                              "fas fa-newspaper"
                            }
                          ></i>
                        </div>
                      )}
                    </div>
                    <div className="news-sidebar-content">
                      <span className={`news-badge small ${article.category}`}>
                        {CATEGORY_LABELS[article.category]}
                      </span>
                      <h3>{article.title}</h3>
                      <span className="news-date">{article.date}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Articles Grid */}
      {regularArticles.length > 0 ? (
        <section className="news-grid-section">
          <div className="news-grid">
            {regularArticles.map((article) => (
              <Link
                href={`/news/${article.id}`}
                key={article.id}
                className="news-card"
              >
                <div className="news-card-image">
                  {article.coverImage ? (
                    <img src={article.coverImage} alt={article.title} />
                  ) : (
                    <div className="news-card-placeholder">
                      <i
                        className={
                          CATEGORY_ICONS[article.category] || "fas fa-newspaper"
                        }
                      ></i>
                    </div>
                  )}
                  <span className={`news-badge ${article.category}`}>
                    {CATEGORY_LABELS[article.category]}
                  </span>
                </div>
                <div className="news-card-body">
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  <div className="news-card-footer">
                    <span className="news-date">
                      <i className="fas fa-calendar"></i> {article.date}
                    </span>
                    {article.teams?.length > 0 && (
                      <div className="news-card-teams">
                        {article.teams.map((t) => (
                          <span
                            key={t.id}
                            className="news-team-pill"
                            style={{ borderColor: t.colors.primary }}
                          >
                            {t.shortName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="news-empty">
          <i className="fas fa-newspaper"></i>
          <h3>Мэдээ байхгүй байна</h3>
          <p>Одоогоор энэ ангилалд мэдээ оруулаагүй байна</p>
        </div>
      )}
    </main>
  );
}
