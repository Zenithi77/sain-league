"use client";

import { useState, useEffect, useMemo } from "react";
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

function formatDate(dateStr: string) {
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
}

function readingTime(html: string) {
  const text = html.replace(/<[^>]*>/g, "");
  return Math.max(1, Math.ceil(text.length / 900));
}

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

  const filteredArticles = useMemo(() => {
    if (activeCategory === "all") return articles;
    return articles.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);

  const featuredArticles = useMemo(
    () => articles.filter((a) => a.featured),
    [articles],
  );

  const regularArticles = useMemo(() => {
    if (activeCategory === "all") {
      const featuredIds = new Set(featuredArticles.map((a) => a.id));
      return filteredArticles.filter((a) => !featuredIds.has(a.id));
    }
    return filteredArticles;
  }, [filteredArticles, featuredArticles, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length };
    for (const a of articles) {
      counts[a.category] = (counts[a.category] || 0) + 1;
    }
    return counts;
  }, [articles]);

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
      {/* ── Page Header ── */}
      <div className="news-page-header">
        <div className="news-page-header-inner">
          <span className="news-page-label">SGL Media</span>
          <h1>Мэдээ & Тойм</h1>
          <p>Тоглолтын тойм, highlight, ярилцлага болон бусад мэдээллүүд</p>
        </div>
      </div>

      <div className="news-page-container">
        {/* ── Category Pills ── */}
        <nav className="news-filter-bar">
          <button
            className={`news-pill ${activeCategory === "all" ? "active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            <i className="fas fa-th-large"></i>
            <span>Бүгд</span>
            <span className="news-pill-count">{categoryCounts.all || 0}</span>
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`news-pill ${activeCategory === key ? "active" : ""}`}
              onClick={() => setActiveCategory(key)}
            >
              <i className={CATEGORY_ICONS[key]}></i>
              <span>{label}</span>
              {(categoryCounts[key] ?? 0) > 0 && (
                <span className="news-pill-count">{categoryCounts[key]}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Featured Hero — only on "Бүгд" tab ── */}
        {activeCategory === "all" && featuredArticles.length > 0 && (
          <section className="news-hero-section">
            <Link
              href={`/news/${featuredArticles[0].id}`}
              className="news-hero-main"
            >
              <div className="news-hero-img-wrap">
                {featuredArticles[0].coverImage ? (
                  <img
                    src={featuredArticles[0].coverImage}
                    alt={featuredArticles[0].title}
                  />
                ) : (
                  <div className="news-hero-ph">
                    <i
                      className={
                        CATEGORY_ICONS[featuredArticles[0].category] ||
                        "fas fa-newspaper"
                      }
                    ></i>
                  </div>
                )}
                <div className="news-hero-gradient" />
              </div>
              <div className="news-hero-info">
                <div className="news-hero-top-row">
                  <span className={`news-tag ${featuredArticles[0].category}`}>
                    <i
                      className={CATEGORY_ICONS[featuredArticles[0].category]}
                    ></i>
                    {CATEGORY_LABELS[featuredArticles[0].category]}
                  </span>
                  <span className="news-hero-featured-badge">
                    <i className="fas fa-star"></i> Онцлох
                  </span>
                </div>
                <h2>{featuredArticles[0].title}</h2>
                <p className="news-hero-summary">
                  {featuredArticles[0].summary}
                </p>
                <div className="news-hero-bottom">
                  <span>
                    <i className="far fa-calendar-alt"></i>{" "}
                    {formatDate(featuredArticles[0].date)}
                  </span>
                  <span>
                    <i className="far fa-user"></i> {featuredArticles[0].author}
                  </span>
                  <span>
                    <i className="far fa-clock"></i>{" "}
                    {readingTime(featuredArticles[0].contentHtml || "")} мин
                  </span>
                  {featuredArticles[0].teams?.length > 0 && (
                    <span className="news-hero-teams-row">
                      {featuredArticles[0].teams
                        .map((t) => t.shortName)
                        .join(" vs ")}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {featuredArticles.length > 1 && (
              <div className="news-hero-side">
                {featuredArticles.slice(1, 4).map((article) => (
                  <Link
                    href={`/news/${article.id}`}
                    key={article.id}
                    className="news-hero-side-card"
                  >
                    <div className="news-hero-side-img">
                      {article.coverImage ? (
                        <img src={article.coverImage} alt={article.title} />
                      ) : (
                        <div className="news-hero-side-ph">
                          <i
                            className={
                              CATEGORY_ICONS[article.category] ||
                              "fas fa-newspaper"
                            }
                          ></i>
                        </div>
                      )}
                    </div>
                    <div className="news-hero-side-body">
                      <span className={`news-tag sm ${article.category}`}>
                        {CATEGORY_LABELS[article.category]}
                      </span>
                      <h3>{article.title}</h3>
                      <span className="news-hero-side-date">
                        <i className="far fa-calendar-alt"></i>{" "}
                        {formatDate(article.date)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Section Divider ── */}
        {activeCategory === "all" &&
          featuredArticles.length > 0 &&
          regularArticles.length > 0 && (
            <div className="news-section-divider">
              <span>Сүүлийн мэдээнүүд</span>
            </div>
          )}

        {/* ── Article Cards Grid ── */}
        {regularArticles.length > 0 ? (
          <section className="news-cards-grid">
            {regularArticles.map((article) => (
              <Link
                href={`/news/${article.id}`}
                key={article.id}
                className="ncard"
              >
                <div className="ncard-img">
                  {article.coverImage ? (
                    <img src={article.coverImage} alt={article.title} />
                  ) : (
                    <div className="ncard-ph">
                      <i
                        className={
                          CATEGORY_ICONS[article.category] || "fas fa-newspaper"
                        }
                      ></i>
                    </div>
                  )}
                  <span className={`news-tag ${article.category}`}>
                    {CATEGORY_LABELS[article.category]}
                  </span>
                </div>
                <div className="ncard-body">
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  <div className="ncard-meta">
                    <span className="ncard-date">
                      <i className="far fa-calendar-alt"></i>{" "}
                      {formatDate(article.date)}
                    </span>
                    <span className="ncard-read">
                      <i className="far fa-clock"></i>{" "}
                      {readingTime(article.contentHtml || "")} мин
                    </span>
                  </div>
                  {article.teams?.length > 0 && (
                    <div className="ncard-teams">
                      {article.teams.map((t) => (
                        <span
                          key={t.id}
                          className="ncard-team"
                          style={
                            {
                              "--team-clr": t.colors?.primary || "#f15f22",
                            } as React.CSSProperties
                          }
                        >
                          {t.shortName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <div className="news-empty-state">
            <div className="news-empty-icon">
              <i className="fas fa-newspaper"></i>
            </div>
            <h3>Мэдээ байхгүй байна</h3>
            <p>Одоогоор энэ ангилалд мэдээ оруулаагүй байна</p>
          </div>
        )}
      </div>
    </main>
  );
}
