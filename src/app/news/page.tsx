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

const CATEGORY_COLORS: Record<string, string> = {
  highlight: "#F15F22",
  recap: "#0072BC",
  announcement: "#20C4F4",
  interview: "#1F9E5A",
  transfer: "#E0A800",
};

function catColor(cat: string) {
  return CATEGORY_COLORS[cat] || "#F15F22";
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("mn-MN", {
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
    (async () => {
      try {
        const res = await fetch("/api/news?status=published");
        if (res.ok) setArticles(await res.json());
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? articles
        : articles.filter((a) => a.category === activeCategory),
    [articles, activeCategory],
  );

  const featured = useMemo(
    () => articles.find((a) => a.featured) || articles[0] || null,
    [articles],
  );

  const gridArticles = useMemo(() => {
    if (activeCategory === "all" && featured) {
      return filtered.filter((a) => a.id !== featured.id);
    }
    return filtered;
  }, [filtered, featured, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length };
    for (const a of articles) counts[a.category] = (counts[a.category] || 0) + 1;
    return counts;
  }, [articles]);

  const cats = ["all", ...Object.keys(CATEGORY_LABELS)];

  return (
    <main className="main-content">
      {/* HERO */}
      <section className="sgl-hero" style={{ padding: "44px 34px 24px" }}>
        <div
          className="sgl-hero-blob"
          style={{ top: -70, right: "6%", width: 300, height: 300, background: "radial-gradient(circle,rgba(241,95,34,.14),transparent 68%)", animation: "sgl-blob 16s ease-in-out infinite" }}
        />
        <div className="sgl-hero-inner">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              background: "#fff",
              border: "1px solid rgba(241,95,34,.25)",
              padding: "7px 15px",
              borderRadius: 999,
              boxShadow: "0 8px 22px -14px rgba(241,95,34,.6)",
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#F15F22", animation: "sgl-pulse-dot 1.8s infinite" }} />
            <span style={{ fontFamily: "var(--sgl-head)", fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#F15F22" }}>
              Сүүлийн үйл явдал
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(34px, 9vw, 58px)" }}>МЭДЭЭ</h1>
          <p>Лигийн сүүлийн мэдээ, шинжилгээ, тоглогчдын онцлох мөчүүд.</p>
        </div>
      </section>

      {loading ? (
        <p style={{ textAlign: "center", padding: 60, color: "var(--sgl-muted)" }}>Мэдээ ачааллаж байна...</p>
      ) : (
        <>
          {/* FEATURED */}
          {activeCategory === "all" && featured && (
            <section style={{ paddingTop: 14 }}>
              <Link href={`/news/${featured.id}`} className="sgl-feat sgl-card sgl-reveal" style={{ overflow: "hidden" }}>
                <div style={{ position: "relative", minHeight: 280, background: catColor(featured.category), overflow: "hidden" }}>
                  {featured.coverImage ? (
                    <img src={featured.coverImage} alt={featured.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.16) 14px,transparent 14px,transparent 28px)" }} />
                  )}
                  <span style={{ position: "absolute", left: 20, top: 20, background: "rgba(255,255,255,.92)", color: catColor(featured.category), fontSize: 11, fontWeight: 800, letterSpacing: 1, padding: "6px 13px", borderRadius: 999, textTransform: "uppercase" }}>
                    ★ Онцлох
                  </span>
                </div>
                <div style={{ padding: "34px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: catColor(featured.category), textTransform: "uppercase" }}>
                      {CATEGORY_LABELS[featured.category] || featured.category}
                    </span>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#C7C7CE" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sgl-muted)" }}>{formatDate(featured.date)}</span>
                  </div>
                  <h2 style={{ fontFamily: "var(--sgl-head)", fontSize: "clamp(23px, 5vw, 32px)", fontWeight: 700, lineHeight: 1.08, color: "var(--sgl-ink)" }}>
                    {featured.title}
                  </h2>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--sgl-muted-3)", fontWeight: 500, marginTop: 14 }}>
                    {featured.summary}
                  </p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 22, fontSize: 14, fontWeight: 800, color: "#F15F22" }}>
                    Дэлгэрэнгүй унших →
                  </span>
                </div>
              </Link>
            </section>
          )}

          {/* FILTERS */}
          <section style={{ paddingTop: 24 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cats.map((c) => {
                const active = activeCategory === c;
                const count = categoryCounts[c] ?? 0;
                if (c !== "all" && count === 0) return null;
                return (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    style={{
                      fontFamily: "var(--sgl-head)",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      padding: "9px 16px",
                      borderRadius: 999,
                      cursor: "pointer",
                      border: "1.5px solid",
                      background: active ? "#17171F" : "#fff",
                      color: active ? "#fff" : "var(--sgl-muted)",
                      borderColor: active ? "#17171F" : "rgba(23,23,31,.08)",
                      transition: "all .2s ease",
                    }}
                  >
                    {c === "all" ? "Бүгд" : CATEGORY_LABELS[c]}
                    {count > 0 && <span style={{ opacity: 0.7 }}> · {count}</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* GRID */}
          <section style={{ paddingTop: 14 }}>
            {gridArticles.length > 0 ? (
              <div className="sgl-news-grid">
                {gridArticles.map((a) => (
                  <Link key={a.id} href={`/news/${a.id}`} className="sgl-card sgl-reveal" style={{ display: "block", overflow: "hidden" }}>
                    <div style={{ position: "relative", height: 150, background: catColor(a.category), overflow: "hidden" }}>
                      {a.coverImage ? (
                        <img src={a.coverImage} alt={a.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.16) 12px,transparent 12px,transparent 24px)" }} />
                      )}
                      <span style={{ position: "absolute", left: 14, top: 14, background: "rgba(255,255,255,.92)", color: catColor(a.category), fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: "5px 11px", borderRadius: 999, textTransform: "uppercase" }}>
                        {CATEGORY_LABELS[a.category] || a.category}
                      </span>
                    </div>
                    <div style={{ padding: "18px 20px 22px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--sgl-muted)", letterSpacing: 0.5 }}>
                        <span>{formatDate(a.date)}</span>
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#C7C7CE" }} />
                        <span>{readingTime(a.contentHtml || "")} мин</span>
                      </div>
                      <h3 style={{ fontFamily: "var(--sgl-head)", fontSize: 19, fontWeight: 600, lineHeight: 1.18, margin: "7px 0 8px", color: "var(--sgl-ink)" }}>
                        {a.title}
                      </h3>
                      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--sgl-muted-3)", fontWeight: 500 }}>
                        {a.summary}
                      </p>
                      {a.teams?.length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                          {a.teams.map((t) => (
                            <span
                              key={t.id}
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: 0.5,
                                color: "#fff",
                                background: t.colors?.primary || "#F15F22",
                                padding: "3px 9px",
                                borderRadius: 999,
                              }}
                            >
                              {t.shortName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--sgl-muted)" }}>
                <div style={{ fontFamily: "var(--sgl-head)", fontSize: 22, fontWeight: 700, color: "#C7C7CE" }}>Мэдээ байхгүй байна</div>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Одоогоор энэ ангилалд мэдээ оруулаагүй байна.</p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
