'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { NewsArticleWithTeams } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  highlight: 'Тоглолтын тойм',
  recap: 'Тоглолтын дүн',
  announcement: 'Мэдээлэл',
  interview: 'Ярилцлага',
  transfer: 'Шилжилт',
};

const CATEGORY_ICONS: Record<string, string> = {
  highlight: 'fas fa-fire',
  recap: 'fas fa-clipboard-list',
  announcement: 'fas fa-bullhorn',
  interview: 'fas fa-microphone',
  transfer: 'fas fa-exchange-alt',
};

export default function NewsDetailPage() {
  const params = useParams();
  const [article, setArticle] = useState<NewsArticleWithTeams | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticleWithTeams[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Failed to fetch article:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async () => {
    try {
      const res = await fetch('/api/news?limit=4');
      if (res.ok) {
        const data = await res.json();
        setRelatedArticles(data.filter((a: NewsArticleWithTeams) => a.id !== params.id).slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to fetch related:', err);
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
          <Link href="/news" className="btn btn-primary" style={{ marginTop: 16 }}>
            <i className="fas fa-arrow-left"></i> Мэдээ рүү буцах
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      {/* Breadcrumb */}
      <div className="news-breadcrumb">
        <Link href="/news"><i className="fas fa-arrow-left"></i> Мэдээ</Link>
        <span>/</span>
        <span>{CATEGORY_LABELS[article.category]}</span>
      </div>

      <article className="news-article">
        {/* Article Header */}
        <div className="news-article-header">
          <span className={`news-badge ${article.category}`}>
            <i className={CATEGORY_ICONS[article.category]}></i>
            {CATEGORY_LABELS[article.category]}
          </span>
          <h1>{article.title}</h1>
          <div className="news-article-meta">
            <span><i className="fas fa-calendar"></i> {article.date}</span>
            <span><i className="fas fa-user"></i> {article.author}</span>
          </div>
          {article.teams?.length > 0 && (
            <div className="news-article-teams">
              {article.teams.map(t => (
                <Link href={`/teams/${t.id}`} key={t.id} className="news-team-tag" style={{ borderColor: t.colors.primary, color: t.colors.primary }}>
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Hero Image */}
        {article.image && (
          <div className="news-article-hero">
            <img src={article.image} alt={article.title} />
          </div>
        )}

        {/* Summary */}
        <div className="news-article-summary">
          <p>{article.summary}</p>
        </div>

        {/* Content */}
        <div className="news-article-content">
          {article.content.split('\n').map((para, i) => (
            para.trim() ? <p key={i}>{para}</p> : null
          ))}
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="news-related">
          <h2><i className="fas fa-newspaper"></i> Бусад мэдээ</h2>
          <div className="news-related-grid">
            {relatedArticles.map(ra => (
              <Link href={`/news/${ra.id}`} key={ra.id} className="news-card">
                <div className="news-card-image">
                  {ra.image ? (
                    <img src={ra.image} alt={ra.title} />
                  ) : (
                    <div className="news-card-placeholder">
                      <i className={CATEGORY_ICONS[ra.category] || 'fas fa-newspaper'}></i>
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
