"use client";

import { useState, useEffect, FormEvent } from "react";
import type { TeamWithAverages } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getTeams } from "@/lib/firestore";

export default function AdminPlayersPage() {
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
  const { getIdToken } = useAuth();

  const getAuthHeaders = async () => {
    const token = await getIdToken();
    return { Authorization: `Bearer ${token}` };
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
        headers: { "Content-Type": "application/json", ...authHeaders },
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

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-user-plus"></i> Тоглогч удирдах
        </h1>
        <p>Шинэ тоглогч нэмэх, тоглогчдын мэдээлэл удирдах</p>
      </div>

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
    </div>
  );
}
