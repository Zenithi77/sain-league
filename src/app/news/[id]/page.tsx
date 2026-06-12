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

const CATEGORY_COLORS: Record<string, string> = {
  highlight: "#F15F22",
  recap: "#0072BC",
  announcement: "#20C4F4",
  interview: "#1F9E5A",
  transfer: "#E0A800",
};

function catColor(c: string) {
  return CATEGORY_COLORS[c] || "#F15F22";
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("mn-MN", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function NewsDetailPage() {
  const params = useParams();
  const [article, setArticle] = useState<NewsArticleWithTeams | null>(null);
  const [related, setRelated] = useState<NewsArticleWithTeams[]>([]);
  const [loading, setLoading] = useState(true);

  const handleTocReady = useCallback((_items: TocItem[]) => {}, []);

  useEffect(() => {
    if (!params.id) return;
    const id = params.id as string;
    (async () => {
      try {
        const res = await fetch(`/api/news/${id}`);
        if (res.ok) setArticle(await res.json());
      } catch (err) {
        console.error("Failed to fetch article:", err);
      } finally {
        setLoading(false);
      }
    })();
    (async () => {
      try {
        const res = await fetch("/api/news?limit=4");
        if (res.ok) {
          const data = await res.json();
          setRelated(data.filter((a: NewsArticleWithTeams) => a.id !== id).slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to fetch related:", err);
      }
    })();
  }, [params.id]);

  if (loading) {
    return <p style={{ textAlign: "center", padding: 60, color: "var(--sgl-muted)" }}>Мэдээ ачааллаж байна...</p>;
  }

  if (!article) {
    return (
      <main style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontFamily: "var(--sgl-head)", fontSize: 24, fontWeight: 700, color: "var(--sgl-ink)" }}>Мэдээ олдсонгүй</div>
        <Link href="/news" className="sgl-btn sgl-btn-ghost" style={{ marginTop: 18 }}>← Мэдээ рүү буцах</Link>
      </main>
    );
  }

  const color = catColor(article.category);

  return (
    <main style={{ paddingTop: 18 }}>
      {/* ARTICLE */}
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "0 26px" }}>
        {/* breadcrumb */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)", display: "flex", alignItems: "center", gap: 7, marginBottom: 18 }}>
          <Link href="/news" style={{ color: "var(--sgl-muted)" }}>Мэдээ</Link>
          <span>/</span>
          <span style={{ color: "var(--sgl-ink)" }}>{CATEGORY_LABELS[article.category] || article.category}</span>
        </div>

        <div className="sgl-reveal">
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#fff", background: color, padding: "5px 13px", borderRadius: 999, textTransform: "uppercase" }}>
              {CATEGORY_LABELS[article.category] || article.category}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--sgl-muted)" }}>{formatDate(article.date)}</span>
          </div>
          <h1 style={{ fontFamily: "var(--sgl-head)", fontWeight: 700, fontSize: 44, lineHeight: 1.06, letterSpacing: 0.3, color: "var(--sgl-ink)" }}>
            {article.title}
          </h1>

          {/* author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 20, paddingBottom: 22, borderBottom: "1px solid rgba(23,23,31,.08)" }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sgl-head)", fontWeight: 700, color: "#fff", fontSize: 15 }}>
              {(article.author || "S").charAt(0).toUpperCase()}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--sgl-ink)", lineHeight: 1.1 }}>{article.author || "SGL Media"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--sgl-muted)", lineHeight: 1.1 }}>Сэтгүүлч</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <ShareButton title={article.title} />
            </div>
          </div>
        </div>

        {/* cover */}
        {article.coverImage ? (
          <div className="sgl-reveal" style={{ position: "relative", height: 340, borderRadius: 22, overflow: "hidden", margin: "24px 0" }}>
            <img src={article.coverImage} alt={article.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div className="sgl-reveal" style={{ position: "relative", height: 300, borderRadius: 22, overflow: "hidden", background: color, margin: "24px 0" }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.16) 16px,transparent 16px,transparent 32px)" }} />
          </div>
        )}

        {/* body */}
        <div className="sgl-reveal">
          {article.summary && (
            <p style={{ fontSize: 20, lineHeight: 1.6, color: "var(--sgl-ink)", fontWeight: 600, marginBottom: 22 }}>
              {article.summary}
            </p>
          )}
          <div className="sgl-news-body">
            <NewsContent content={article.contentHtml || ""} articleId={article.id} onTocReady={handleTocReady} />
          </div>
        </div>

        {/* team tags */}
        {article.teams?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "26px 0 38px", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)", letterSpacing: 1, textTransform: "uppercase", marginRight: 6 }}>
              Багууд
            </span>
            {article.teams.map((t) => (
              <Link
                key={t.id}
                href={`/teams/${t.id}`}
                style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: t.colors?.primary || "#F15F22", padding: "6px 13px", borderRadius: 999 }}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}

        <div style={{ paddingBottom: 30 }}>
          <Link href="/news" className="sgl-btn sgl-btn-ghost" style={{ fontSize: 14, padding: "12px 22px" }}>
            ← Бүх мэдээ рүү буцах
          </Link>
        </div>
      </article>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="sgl-section" style={{ paddingTop: 8, paddingBottom: 36 }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <h2 className="sgl-h2" style={{ fontSize: 24, marginBottom: 18 }}>
              <span className="sgl-bar" style={{ height: 24 }} />
              Холбоотой мэдээ
            </h2>
            <div className="sgl-news-grid">
              {related.map((n) => (
                <Link key={n.id} href={`/news/${n.id}`} className="sgl-card sgl-reveal" style={{ display: "block", overflow: "hidden" }}>
                  <div style={{ position: "relative", height: 130, background: catColor(n.category), overflow: "hidden" }}>
                    {n.coverImage ? (
                      <img src={n.coverImage} alt={n.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.16) 12px,transparent 12px,transparent 24px)" }} />
                    )}
                    <span style={{ position: "absolute", left: 14, top: 14, background: "rgba(255,255,255,.92)", color: catColor(n.category), fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: "5px 11px", borderRadius: 999, textTransform: "uppercase" }}>
                      {CATEGORY_LABELS[n.category] || n.category}
                    </span>
                  </div>
                  <div style={{ padding: "16px 18px 20px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)" }}>{formatDate(n.date)}</span>
                    <h3 style={{ fontFamily: "var(--sgl-head)", fontSize: 18, fontWeight: 600, lineHeight: 1.18, marginTop: 6, color: "var(--sgl-ink)" }}>
                      {n.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
