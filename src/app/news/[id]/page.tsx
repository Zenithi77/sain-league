"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import NewsContent from "@/components/NewsContent";
import type { TocItem } from "@/components/NewsContent";
import ShareButton from "@/components/ShareButton";
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

export default function NewsDetailPage() {
  const params = useParams();
  const [article, setArticle] = useState<NewsArticleWithTeams | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<
    NewsArticleWithTeams[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  const handleTocReady = useCallback((items: TocItem[]) => {
    setTocItems(items);
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchArticle(params.id as string);
      fetchRelated();
    }
  }, [params.id]);

  const fetchArticle = async (id: string) => {
    try {
      const res = await fetch(`/api/news/${id}`);
      if (res.ok) {
        const data = await res.json();
        setArticle(data);
      }
    } catch (err) {
      console.error("Failed to fetch article:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async () => {
    try {
      const res = await fetch("/api/news?limit=4");
      if (res.ok) {
        const data = await res.json();
        setRelatedArticles(
          data
            .filter((a: NewsArticleWithTeams) => a.id !== params.id)
            .slice(0, 3),
        );
      }
    } catch (err) {
      console.error("Failed to fetch related:", err);
    }
  };

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

  if (!article) {
    return (
      <main className="main-content">
        <div className="news-empty">
          <i className="fas fa-exclamation-circle"></i>
          <h3>Мэдээ олдсонгүй</h3>
          <Link
            href="/news"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
          >
            <i className="fas fa-arrow-left"></i> Мэдээ рүү буцах
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <article className="news-detail-page">
        {/* Hero Header */}
        <header className="news-detail-hero">
          <div className="news-detail-hero-inner">
            <Link href="/news" className="news-detail-back">
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Бүх мэдээ
            </Link>
            <br />
            <span className={`news-badge ${article.category}`}>
              <i className={CATEGORY_ICONS[article.category]}></i>
              {CATEGORY_LABELS[article.category]}
            </span>

            <h1 className="news-detail-title">{article.title}</h1>

            <div className="news-detail-meta">
              <span>
                <i className="fas fa-calendar"></i> {article.date}
              </span>
              <span className="news-detail-meta-sep">•</span>
              <span>
                <i className="fas fa-user"></i> {article.author}
              </span>
            </div>

            {article.teams?.length > 0 && (
              <div className="news-detail-teams">
                {article.teams.map((t) => (
                  <Link
                    href={`/teams/${t.id}`}
                    key={t.id}
                    className="news-detail-team-tag"
                    style={{
                      borderColor: t.colors.primary,
                      color: t.colors.primary,
                    }}
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Cover Image */}
        {article.coverImage && (
          <div className="news-detail-cover-wrap">
            <div className="news-detail-cover">
              <img src={article.coverImage} alt={article.title} />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="news-detail-body">
          <div
            className={`news-detail-layout ${tocItems.length > 0 ? "has-toc" : ""}`}
          >
            {/* Table of Contents — sidebar */}
            {tocItems.length > 0 && (
              <aside className="news-detail-toc">
                <div className="news-detail-toc-inner">
                  <h3 className="news-detail-toc-title">Агуулга</h3>
                  <nav className="news-detail-toc-nav">
                    {tocItems.map((item, idx) => (
                      <a
                        key={idx}
                        href={`#${item.id}`}
                        className={`news-detail-toc-link toc-${item.level}`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            {/* Main Content */}
            <div className="news-detail-main">
              {/* Summary */}
              {article.summary && (
                <div className="news-detail-summary">
                  <p>{article.summary}</p>
                </div>
              )}

              {/* Article HTML Content */}
              <NewsContent
                content={article.contentHtml || ""}
                articleId={article.id}
                onTocReady={handleTocReady}
              />

              {/* Share & Footer */}
              <div className="news-detail-footer">
                <div className="news-detail-share-row">
                  <div className="news-detail-share-label">
                    <span>Хуваалцах:</span>
                    <ShareButton title={article.title} />
                  </div>
                </div>

                <div className="news-detail-back-link">
                  <Link href="/news" className="news-detail-back-btn">
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Бүх мэдээ рүү буцах
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="news-related">
          <h2>
            <i className="fas fa-newspaper"></i> Бусад мэдээ
          </h2>
          <div className="news-related-grid">
            {relatedArticles.map((ra) => (
              <Link href={`/news/${ra.id}`} key={ra.id} className="news-card">
                <div className="news-card-image">
                  {ra.coverImage ? (
                    <img src={ra.coverImage} alt={ra.title} />
                  ) : (
                    <div className="news-card-placeholder">
                      <i
                        className={
                          CATEGORY_ICONS[ra.category] || "fas fa-newspaper"
                        }
                      ></i>
                    </div>
                  )}
                  <span className={`news-badge ${ra.category}`}>
                    {CATEGORY_LABELS[ra.category]}
                  </span>
                </div>
                <div className="news-card-body">
                  <h3>{ra.title}</h3>
                  <p>{ra.summary}</p>
                  <span className="news-date">
                    <i className="fas fa-calendar"></i> {ra.date}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
