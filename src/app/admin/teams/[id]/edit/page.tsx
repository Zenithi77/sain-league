"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { Team } from "@/types";
import { getTeam, updateTeam } from "@/lib/firestore";

export default function AdminTeamsEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!id) return;
    getTeam(id)
      .then((data) => {
        setTeam(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading team:", err);
        setLoading(false);
      });
  }, [id]);

  const handleEditTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!team) return;

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
      await updateTeam(id, {
        name,
        shortName,
        city,
        conference,
        school,
        coach: {
          id: team.coach?.id || `coach-${Date.now()}`,
          name: coachName,
          image: team.coach?.image || "/assets/coaches/default.png",
        },
        colors: { primary: primaryColor, secondary: secondaryColor },
      });
      router.push("/admin/teams");
    } catch (error) {
      console.error("Error updating team:", error);
      alert("Баг шинэчлэхэд алдаа гарлаа");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-content">
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
          <p style={{ marginTop: 12 }}>Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="admin-page-content">
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <i
            className="fas fa-exclamation-triangle"
            style={{ fontSize: 24 }}
          ></i>
          <p style={{ marginTop: 12 }}>Баг олдсонгүй</p>
          <Link
            href="/admin/teams"
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
          >
            Буцах
          </Link>
        </div>
      </div>
    );
  }

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
              <i className="fas fa-edit"></i> Баг засварлах
            </h1>
            <p>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: team.colors?.primary || "var(--primary-color)",
                  marginRight: 6,
                  verticalAlign: "middle",
                }}
              />
              {team.name}
            </p>
          </div>
        </div>
      </div>

      <section className="admin-section">
        <form onSubmit={handleEditTeam}>
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
                defaultValue={team.name}
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
                defaultValue={team.shortName}
                maxLength={4}
              />
            </div>
            <div className="form-group">
              <label>Хот</label>
              <input type="text" name="city" defaultValue={team.city} />
            </div>
            <div className="form-group">
              <label>
                Бүс <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
              <select name="conference" required defaultValue={team.conference}>
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
                defaultValue={team.school}
              />
            </div>
            <div className="form-group">
              <label>Дасгалжуулагч</label>
              <input
                type="text"
                name="coachName"
                defaultValue={team.coach?.name || ""}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Үндсэн өнгө</label>
              <input
                type="color"
                name="primaryColor"
                defaultValue={team.colors?.primary || "#F15F22"}
              />
            </div>
            <div className="form-group">
              <label>Хоёрдогч өнгө</label>
              <input
                type="color"
                name="secondaryColor"
                defaultValue={team.colors?.secondary || "#1A1A2E"}
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
                    <i className="fas fa-save"></i> Хадгалах
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
