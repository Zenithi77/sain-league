"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Team, TeamWithAverages, NewsArticleWithTeams } from "@/types";
import AdminGuard from "@/components/AdminGuard";
import AdminSeasonManager from "@/components/AdminSeasonManager";
import AdminProfileImages from "@/components/AdminProfileImages";
import { useAuth } from "@/contexts/AuthContext";
import { getTeams, createTeam } from "@/lib/firestore";

function AdminContent() {
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticleWithTeams[]>([]);
  const { userData, getIdToken } = useAuth();

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const token = await getIdToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  };

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

  const handleAddNews = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const newsData = {
      title: formData.get("newsTitle"),
      summary: formData.get("newsSummary"),
      content: formData.get("newsContent"),
      image: formData.get("newsImage") || "",
      category: formData.get("newsCategory") || "announcement",
      featured: formData.get("newsFeatured") === "on",
      teamIds: Array.from(form.querySelectorAll<HTMLInputElement>('input[name="newsTeamIds"]:checked')).map(cb => cb.value),
      author: formData.get("newsAuthor") || "SGL Admin",
    };

    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newsData),
      });

      if (res.ok) {
        alert("Мэдээ амжилттай нэмэгдлээ!");
        form.reset();
        fetchNews();
      } else {
        const data = await res.json();
        alert(data.error || "Алдаа гарлаа");
      }
    } catch (error) {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
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

  const handleAddPlayer = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const playerData = {
      name: formData.get("name"),
      teamId: formData.get("teamId"),
      number: parseInt(formData.get("number") as string),
      position: formData.get("position"),
      height: formData.get("height"),
      weight: formData.get("weight"),
      age: parseInt(formData.get("age") as string) || 0,
    };

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(playerData),
      });

      if (res.ok) {
        alert("Тоглогч амжилттай нэмэгдлээ!");
        form.reset();
      } else {
        const data = await res.json();
        alert(data.error || "Алдаа гарлаа");
      }
    } catch (error) {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
  };

  const handleAddTeam = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const name = ((formData.get("name") as string) || "").trim();
    const shortName = ((formData.get("shortName") as string) || "").trim();
    const city = ((formData.get("city") as string) || "").trim();
    const conference = ((formData.get("conference") as string) || "").trim() as
      | "east"
      | "west";
    const school = ((formData.get("school") as string) || "").trim();
    const coachName = ((formData.get("coachName") as string) || "").trim();
    const primaryColor = (formData.get("primaryColor") as string) || "#FF6B35";
    const secondaryColor =
      (formData.get("secondaryColor") as string) || "#1A1A2E";

    if (!name || name.length < 2) {
      alert("Багийн нэр заавал оруулах шаардлагатай (2+ тэмдэгт)");
      return;
    }
    if (!shortName || shortName.length < 2) {
      alert("Товчилсон нэр заавал оруулах шаардлагатай");
      return;
    }
    if (!conference || (conference !== "east" && conference !== "west")) {
      alert("Бүс заавал сонгох шаардлагатай (East/West)");
      return;
    }
    if (!school || school.length < 2) {
      alert("Сургуулийн нэр заавал оруулах шаардлагатай (2+ тэмдэгт)");
      return;
    }

    try {
      const teamData: Omit<Team, "id"> = {
        name,
        shortName,
        logo: "/assets/logos/default.png",
        city,
        conference,
        school,
        coach: {
          id: `coach-${Date.now()}`,
          name: coachName,
          image: "/assets/coaches/default.png",
        },
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
        },
        stats: {
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          gamesPlayed: 0,
        },
      };

      await createTeam(teamData);
      alert("Баг амжилттай нэмэгдлээ!");
      form.reset();
      fetchTeams();
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Баг үүсгэхэд алдаа гарлаа");
    }
  };

  return (
    <main className="main-content">
      <div className="page-header">
        <h1>
          <i className="fas fa-cog"></i> Админ Панел
        </h1>
        <p>Улирал удирдах, баг болон тоглогч нэмэх</p>
        {userData && (
          <p style={{ color: "var(--primary-color)", marginTop: "10px" }}>
            <i className="fas fa-user-shield"></i> {userData.email} (
            {userData.role})
          </p>
        )}
      </div>

      {/* Season Manager */}
      <AdminSeasonManager />

      {/* Add New Player Section */}
      <section className="admin-section">
        <h3>
          <i className="fas fa-user-plus"></i> Шинэ тоглогч нэмэх
        </h3>
        <form onSubmit={handleAddPlayer}>
          <div className="form-row">
            <div className="form-group">
              <label>Нэр</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Тоглогчийн нэр"
              />
            </div>
            <div className="form-group">
              <label>Баг</label>
              <select name="teamId" className="team-select" required>
                <option value="">Баг сонгох</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Дугаар</label>
              <input type="number" name="number" required placeholder="23" />
            </div>
            <div className="form-group">
              <label>Байрлал</label>
              <select name="position" required>
                <option value="PG">PG - Point Guard</option>
                <option value="SG">SG - Shooting Guard</option>
                <option value="SF">SF - Small Forward</option>
                <option value="PF">PF - Power Forward</option>
                <option value="C">C - Center</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Өндөр</label>
              <input type="text" name="height" placeholder="175 см" />
            </div>
            <div className="form-group">
              <label>Жин</label>
              <input type="text" name="weight" placeholder="65 кг" />
            </div>
            <div className="form-group">
              <label>Нас</label>
              <input type="number" name="age" placeholder="22" />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                <i className="fas fa-plus"></i> Нэмэх
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Add New Team Section */}
      <section className="admin-section">
        <h3>
          <i className="fas fa-users"></i> Шинэ баг нэмэх
        </h3>
        <form onSubmit={handleAddTeam}>
          <div className="form-row">
            <div className="form-group">
              <label>Багийн нэр</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ulaanbaatar Warriors"
              />
            </div>
            <div className="form-group">
              <label>Товчлол (3-4 үсэг)</label>
              <input
                type="text"
                name="shortName"
                required
                placeholder="UBW"
                maxLength={4}
              />
            </div>
            <div className="form-group">
              <label>Хот</label>
              <input
                type="text"
                name="city"
                required
                placeholder="Улаанбаатар"
              />
            </div>
            <div className="form-group">
              <label>Бүс</label>
              <select name="conference" required>
                <option value="">Бүс сонгох</option>
                <option value="east">East</option>
                <option value="west">West</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Сургууль</label>
              <input
                type="text"
                name="school"
                required
                placeholder="Сургуулийн нэр"
              />
            </div>
            <div className="form-group">
              <label>Дасгалжуулагч</label>
              <input type="text" name="coachName" placeholder="Нэр" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Үндсэн өнгө</label>
              <input type="color" name="primaryColor" defaultValue="#F15F22" />
            </div>
            <div className="form-group">
              <label>Хоёрдогч өнгө</label>
              <input
                type="color"
                name="secondaryColor"
                defaultValue="#1A1A2E"
              />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                <i className="fas fa-plus"></i> Баг нэмэх
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* News Management Section */}
      <section className="admin-section">
        <h3>
          <i className="fas fa-newspaper"></i> Мэдээ нэмэх
        </h3>
        <form onSubmit={handleAddNews}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Гарчиг</label>
              <input
                type="text"
                name="newsTitle"
                required
                placeholder="Тоглолтын тойм: 33 Sparks vs Storm Team"
              />
            </div>
            <div className="form-group">
              <label>Ангилал</label>
              <select name="newsCategory" required>
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
                name="newsAuthor"
                placeholder="SGL Admin"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Товч тайлбар</label>
              <input
                type="text"
                name="newsSummary"
                required
                placeholder="Тоглолтын гол онцлог мэдээлэл..."
              />
            </div>
            <div className="form-group">
              <label>Зургийн URL</label>
              <input
                type="text"
                name="newsImage"
                placeholder="https://... эсвэл /images/..."
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Дэлгэрэнгүй агуулга</label>
              <textarea
                name="newsContent"
                required
                rows={5}
                placeholder="Мэдээний бүрэн агуулга энд бичнэ... Мөр тус бүр шинэ параграф болно."
                style={{
                  width: "100%",
                  background: "var(--bg-dark)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px",
                  color: "var(--text-light)",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>
          </div>
          <div className="form-row" style={{ alignItems: "flex-start" }}>
            <div className="form-group">
              <label>Холбогдох багууд</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {teams.map((team) => (
                  <label
                    key={team.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      background: "var(--bg-dark)",
                      borderRadius: "6px",
                      fontSize: "13px",
                      cursor: "pointer",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <input type="checkbox" name="newsTeamIds" value={team.id} />
                    {team.shortName}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" name="newsFeatured" />
                Онцлох мэдээ (Featured)
              </label>
            </div>
            <div className="form-group">
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                <i className="fas fa-plus"></i> Мэдээ нэмэх
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Profile Images Manager */}
      <AdminProfileImages />

      {/* Existing News List */}
      {newsArticles.length > 0 && (
        <section className="admin-section">
          <h3>
            <i className="fas fa-list"></i> Нэмсэн мэдээнүүд ({newsArticles.length})
          </h3>
          <div className="admin-news-list">
            {newsArticles.map((article) => (
              <div key={article.id} className="admin-news-item">
                <div className="admin-news-info">
                  <span className={`news-badge small ${article.category}`}>
                    {article.category}
                  </span>
                  <strong>{article.title}</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {article.date}
                  </span>
                  {article.featured && (
                    <span style={{ color: "var(--warning-color)", fontSize: "11px" }}>
                      <i className="fas fa-star"></i> Featured
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteNews(article.id)}
                  className="btn-delete-news"
                  title="Устгах"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
