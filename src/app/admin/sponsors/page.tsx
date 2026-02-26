"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { Sponsor } from "@/types";

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Sponsor>>({});
  const [uploading, setUploading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [addLogoPreview, setAddLogoPreview] = useState<string>("");
  const [editLogoPreview, setEditLogoPreview] = useState<string>("");
  const addFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  // hidden input to store the uploaded URL in the add form
  const [addLogoUrl, setAddLogoUrl] = useState<string>("");

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    try {
      const res = await fetch("/api/sponsors");
      if (res.ok) {
        const data = await res.json();
        setSponsors(data);
      }
    } catch (error) {
      console.error("Error fetching sponsors:", error);
    }
  };

  /** Upload a file to Firebase Storage under sponsors/ and return the download URL */
  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "png";
    const filename = `sponsors/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  /** Handle file selection for the ADD form */
  const handleAddFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // show local preview immediately
    setAddLogoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      setAddLogoUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Зураг upload хийхэд алдаа гарлаа");
      setAddLogoPreview("");
    } finally {
      setUploading(false);
    }
  };

  /** Handle file selection for the EDIT form */
  const handleEditFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditLogoPreview(URL.createObjectURL(file));
    setEditUploading(true);
    try {
      const url = await uploadLogo(file);
      setEditForm((prev) => ({ ...prev, logo: url }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Зураг upload хийхэд алдаа гарлаа");
    } finally {
      setEditUploading(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const sponsorData = {
      name: formData.get("name"),
      logo: addLogoUrl || (formData.get("logoUrl") as string) || "",
      website: formData.get("website"),
    };

    try {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sponsorData),
      });

      if (res.ok) {
        alert("Хамтрагч амжилттай нэмэгдлээ!");
        form.reset();
        setAddLogoUrl("");
        setAddLogoPreview("");
        if (addFileRef.current) addFileRef.current.value = "";
        fetchSponsors();
      } else {
        const data = await res.json();
        alert(data.error || "Алдаа гарлаа");
      }
    } catch (error) {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ хамтрагчийг устгах уу?")) return;
    try {
      const res = await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSponsors();
      } else {
        alert("Устгахад алдаа гарлаа");
      }
    } catch (error) {
      alert("Сервертэй холбогдоход алдаа гарлаа");
    }
  };

  const startEdit = (sponsor: Sponsor) => {
    setEditingId(sponsor.id);
    setEditForm({
      name: sponsor.name,
      logo: sponsor.logo,
      website: sponsor.website,
    });
    setEditLogoPreview(sponsor.logo || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditLogoPreview("");
    if (editFileRef.current) editFileRef.current.value = "";
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/sponsors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        alert("Амжилттай шинэчлэгдлээ!");
        setEditingId(null);
        setEditForm({});
        fetchSponsors();
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
          <i className="fas fa-handshake"></i> Хамтрагч байгууллагууд
        </h1>
        <p>Хамтрагч/спонсор нэмэх, засах, устгах</p>
      </div>

      {/* Add new sponsor */}
      <section className="admin-section">
        <h3>
          <i className="fas fa-plus-circle"></i> Хамтрагч нэмэх
        </h3>
        <form onSubmit={handleAdd} className="sponsor-add-form">
          <div className="sponsor-add-grid">
            {/* Logo upload area */}
            <div className="sponsor-upload-area">
              <input
                type="file"
                accept="image/*"
                ref={addFileRef}
                onChange={handleAddFileChange}
                id="add-logo-file"
                hidden
              />
              {addLogoPreview && !uploading ? (
                <div className="sponsor-upload-preview">
                  <img src={addLogoPreview} alt="Preview" />
                  <button
                    type="button"
                    className="sponsor-upload-remove"
                    onClick={() => {
                      setAddLogoPreview("");
                      setAddLogoUrl("");
                      if (addFileRef.current) addFileRef.current.value = "";
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="add-logo-file"
                  className="sponsor-upload-placeholder"
                >
                  {uploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt"></i>
                      <span>Лого оруулах</span>
                      <small>PNG, JPG, SVG</small>
                    </>
                  )}
                </label>
              )}
              <input
                type="text"
                name="logoUrl"
                placeholder="эсвэл URL оруулах..."
                className="sponsor-url-fallback"
              />
            </div>

            {/* Form fields */}
            <div className="sponsor-add-fields">
              <div className="form-group">
                <label>
                  <i className="fas fa-building"></i> Байгууллагын нэр *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Жишээ: Mobicom"
                />
              </div>
              <div className="form-group">
                <label>
                  <i className="fas fa-globe"></i> Вэбсайт URL
                </label>
                <input
                  type="text"
                  name="website"
                  placeholder="https://www.example.com"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary sponsor-add-btn"
                disabled={uploading}
              >
                <i className="fas fa-plus"></i> Хамтрагч нэмэх
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Sponsors list — card grid */}
      {sponsors.length > 0 && (
        <section className="admin-section">
          <h3>
            <i className="fas fa-th-large"></i> Бүх хамтрагч байгууллагууд (
            {sponsors.length})
          </h3>
          <div className="admin-sponsor-cards">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className={`admin-sponsor-card ${editingId === sponsor.id ? "editing" : ""}`}
              >
                {editingId === sponsor.id ? (
                  /* Edit mode */
                  <div className="admin-sponsor-edit-card">
                    <div className="sponsor-edit-logo-area">
                      <input
                        type="file"
                        accept="image/*"
                        ref={editFileRef}
                        onChange={handleEditFileChange}
                        id={`edit-logo-${sponsor.id}`}
                        hidden
                      />
                      {(editLogoPreview || editForm.logo) && !editUploading ? (
                        <div className="sponsor-edit-preview">
                          <img
                            src={editLogoPreview || editForm.logo}
                            alt="Logo"
                          />
                          <label
                            htmlFor={`edit-logo-${sponsor.id}`}
                            className="sponsor-edit-change"
                          >
                            <i className="fas fa-camera"></i>
                          </label>
                        </div>
                      ) : (
                        <label
                          htmlFor={`edit-logo-${sponsor.id}`}
                          className="sponsor-edit-upload-btn"
                        >
                          {editUploading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <>
                              <i className="fas fa-cloud-upload-alt"></i>
                              <small>Лого</small>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    <div className="sponsor-edit-fields">
                      <input
                        type="text"
                        value={editForm.name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        placeholder="Нэр"
                        className="sponsor-edit-input"
                      />
                      <input
                        type="text"
                        value={editForm.logo || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, logo: e.target.value })
                        }
                        placeholder="Лого URL"
                        className="sponsor-edit-input small"
                      />
                      <input
                        type="text"
                        value={editForm.website || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, website: e.target.value })
                        }
                        placeholder="Вэбсайт URL"
                        className="sponsor-edit-input small"
                      />
                    </div>
                    <div className="sponsor-edit-actions">
                      <button
                        onClick={() => handleUpdate(sponsor.id)}
                        className="btn btn-primary"
                        disabled={editUploading}
                      >
                        <i className="fas fa-save"></i> Хадгалах
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="btn sponsor-btn-cancel"
                      >
                        Цуцлах
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div className="admin-sponsor-card-logo">
                      {sponsor.logo ? (
                        <img src={sponsor.logo} alt={sponsor.name} />
                      ) : (
                        <div className="admin-sponsor-card-no-logo">
                          <i className="fas fa-building"></i>
                        </div>
                      )}
                    </div>
                    <div className="admin-sponsor-card-body">
                      <h4>{sponsor.name}</h4>
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-sponsor-card-url"
                        >
                          <i className="fas fa-external-link-alt"></i>{" "}
                          {sponsor.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                    <div className="admin-sponsor-card-actions">
                      <button
                        onClick={() => startEdit(sponsor)}
                        className="btn-edit-sponsor"
                        title="Засах"
                      >
                        <i className="fas fa-pen"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(sponsor.id)}
                        className="btn-delete-sponsor"
                        title="Устгах"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {sponsors.length === 0 && (
        <div className="sponsor-empty-state">
          <i className="fas fa-handshake"></i>
          <h3>Хамтрагч байгууллага байхгүй</h3>
          <p>Дээрх формоор хамтрагч байгууллага нэмнэ үү</p>
        </div>
      )}
    </div>
  );
}
