"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Team, TeamWithAverages } from "@/types";
import AdminGuard from "@/components/AdminGuard";
import AdminSeasonManager from "@/components/AdminSeasonManager";
import { useAuth } from "@/contexts/AuthContext";
import { getTeams, createTeam } from "@/lib/firestore";

function AdminContent() {
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
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
  }, []);

  const fetchTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data as TeamWithAverages[]);
    } catch (error) {
      console.error("Error fetching teams:", error);
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
    const conference = ((formData.get("conference") as string) || "").trim() as 'east' | 'west';
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
    if (!conference || (conference !== 'east' && conference !== 'west')) {
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
              <input type="color" name="primaryColor" defaultValue="#FF6B35" />
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
