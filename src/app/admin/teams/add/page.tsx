"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Team } from "@/types";
import { createTeam } from "@/lib/firestore";

export default function AdminTeamsAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

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
    const primaryColor = (formData.get("primaryColor") as string) || "#F15F22";
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
      alert("Бүс заавал сонгох шаардлагатай");
      return;
    }
    if (!school || school.length < 2) {
      alert("Сургуулийн нэр заавал оруулах шаардлагатай (2+ тэмдэгт)");
      return;
    }

    setSaving(true);
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
      router.push("/admin/teams");
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Баг үүсгэхэд алдаа гарлаа");
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/admin/teams"
            className="btn btn-secondary"
            style={{ padding: "6px 14px" }}
          >
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div>
            <h1>
              <i className="fas fa-plus-circle"></i> Шинэ баг нэмэх
            </h1>
            <p>Багийн мэдээллийг бөглөж хадгална уу</p>
          </div>
        </div>
      </div>

      <section className="admin-section">
        <form onSubmit={handleAddTeam}>
          <div className="form-row">
            <div className="form-group">
              <label>
                Багийн нэр{" "}
                <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ulaanbaatar Warriors"
              />
            </div>
            <div className="form-group">
              <label>
                Товчлол (3-4 үсэг){" "}
                <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
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
              <input type="text" name="city" placeholder="Улаанбаатар" />
            </div>
            <div className="form-group">
              <label>
                Бүс <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
              <select name="conference" required>
                <option value="">Бүс сонгох</option>
                <option value="west">Баруун (West)</option>
                <option value="east">Зүүн (East)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>
                Сургууль{" "}
                <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
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
            <div
              className="form-group"
              style={{
                flex: 2,
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Хадгалж байна...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Баг нэмэх
                  </>
                )}
              </button>
              <Link
                href="/admin/teams"
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-times"></i> Цуцлах
              </Link>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
