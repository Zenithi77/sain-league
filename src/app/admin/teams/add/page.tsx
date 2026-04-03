"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { Team } from "@/types";
import { createTeam } from "@/lib/firestore";

export default function AdminTeamsAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#F15F22");
  const [secondaryColor, setSecondaryColor] = useState("#1A1A2E");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Зөвхөн зураг файл оруулна уу");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Зургийн хэмжээ 2MB-аас хэтрэхгүй байх ёстой");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      let logoUrl = "/assets/logos/default.png";

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const safeName = shortName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const storagePath = `team-logos/${safeName}-${Date.now()}.${ext}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(storageRef);
      }

      const teamData: Omit<Team, "id"> = {
        name,
        shortName,
        logo: logoUrl,
        city,
        conference,
        school,
        coach: {
          id: "",
          name: "",
          image: "",
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
      {/* Header */}
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

      <form onSubmit={handleAddTeam} className="team-add-form">
        {/* Row: Logo + Basic Info side by side */}
        <div className="team-add-grid">
          {/* Logo Upload Card */}
          <section className="admin-section team-add-logo-section">
            <h3>
              <i className="fas fa-image"></i> Багийн лого
            </h3>
            <div className="team-logo-upload-area">
              {logoPreview ? (
                <div className="team-logo-preview-wrapper">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={140}
                    height={140}
                    style={{ objectFit: "contain", borderRadius: 12 }}
                  />
                  <button
                    type="button"
                    className="team-logo-remove-btn"
                    onClick={handleRemoveLogo}
                    title="Устгах"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : (
                <div
                  className="team-logo-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  <span>Лого оруулах</span>
                  <small>PNG, JPG — 2MB хүртэл</small>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                style={{ display: "none" }}
              />
              {logoPreview && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 12, width: "100%", fontSize: 13 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-sync-alt"></i> Лого солих
                </button>
              )}
            </div>
          </section>

          {/* Basic Info Card */}
          <section className="admin-section team-add-info-section">
            <h3>
              <i className="fas fa-info-circle"></i> Үндсэн мэдээлэл
            </h3>
            <div
              className="form-row"
              style={{ gridTemplateColumns: "2fr 1fr" }}
            >
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
                  Товчлол{" "}
                  <span style={{ color: "var(--primary-color)" }}>*</span>
                </label>
                <input
                  type="text"
                  name="shortName"
                  required
                  placeholder="UBW"
                  maxLength={4}
                  style={{ textTransform: "uppercase", letterSpacing: 2 }}
                />
              </div>
            </div>
            <div
              className="form-row"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
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
                <label>Хот</label>
                <input type="text" name="city" placeholder="Улаанбаатар" />
              </div>
            </div>
            <div className="form-group">
              <label>
                Бүс <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
              <div className="team-conference-toggle">
                <label className="team-conference-option">
                  <input type="radio" name="conference" value="west" required />
                  <span>
                    <i className="fas fa-compass"></i> Баруун (West)
                  </span>
                </label>
                <label className="team-conference-option">
                  <input type="radio" name="conference" value="east" />
                  <span>
                    <i className="fas fa-compass"></i> Зүүн (East)
                  </span>
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* Colors Card */}
        <section className="admin-section">
          <h3>
            <i className="fas fa-palette"></i> Багийн өнгө
          </h3>
          <div className="team-colors-row">
            <label className="team-color-picker">
              <span className="team-color-label">Үндсэн өнгө</span>
              <div className="team-color-input-wrap">
                <input
                  type="color"
                  name="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <span className="team-color-hex">{primaryColor}</span>
              </div>
            </label>
            <label className="team-color-picker">
              <span className="team-color-label">Хоёрдогч өнгө</span>
              <div className="team-color-input-wrap">
                <input
                  type="color"
                  name="secondaryColor"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
                <span className="team-color-hex">{secondaryColor}</span>
              </div>
            </label>
            <div className="team-color-preview-strip">
              <div
                style={{
                  background: primaryColor,
                  flex: 1,
                  borderRadius: "6px 0 0 6px",
                }}
              />
              <div
                style={{
                  background: secondaryColor,
                  flex: 1,
                  borderRadius: "0 6px 6px 0",
                }}
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="team-add-actions">
          <Link href="/admin/teams" className="btn btn-secondary">
            <i className="fas fa-times"></i> Цуцлах
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Хадгалж байна...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i> Баг нэмэх
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
