"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Team, TeamWithAverages } from "@/types";
import { getTeams, createTeam } from "@/lib/firestore";

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);

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
        colors: { primary: primaryColor, secondary: secondaryColor },
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
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-users"></i> Баг удирдах
        </h1>
        <p>Шинэ баг нэмэх, багийн мэдээлэл удирдах</p>
      </div>

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

      {/* Existing Teams List */}
      {teams.length > 0 && (
        <section className="admin-section">
          <h3>
            <i className="fas fa-list"></i> Бүртгэлтэй багууд ({teams.length})
          </h3>
          <div className="admin-teams-list">
            {teams.map((team) => (
              <div key={team.id} className="admin-team-item">
                <div
                  className="admin-team-color"
                  style={{
                    background: team.colors?.primary || "var(--primary-color)",
                  }}
                />
                <div className="admin-team-info">
                  <strong>{team.name}</strong>
                  <span>
                    {team.shortName} · {team.school || "—"} · {team.conference}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
