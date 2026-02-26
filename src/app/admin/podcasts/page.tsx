"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Podcast } from "@/types";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function AdminPodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Podcast>>({});

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const res = await fetch("/api/podcasts");
      if (res.ok) {
        const data = await res.json();
        setPodcasts(data);
      }
    } catch (error) {
      console.error("Error fetching podcasts:", error);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const podcastData = {
      title: formData.get("title"),
      youtubeUrl: formData.get("youtubeUrl"),
      description: formData.get("description"),
    };

    if (!podcastData.title || !podcastData.youtubeUrl) {
      alert("Гарчиг болон YouTube линк оруулна уу");
      return;
    }

    try {
      const res = await fetch("/api/podcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(podcastData),
      });

      if (res.ok) {
        form.reset();
        fetchPodcasts();
        alert("Подкаст амжилттай нэмэгдлээ!");
      } else {
        const err = await res.json();
        alert(err.error || "Алдаа гарлаа");
      }
    } catch (error) {
      console.error("Error adding podcast:", error);
      alert("Подкаст нэмэхэд алдаа гарлаа");
    }
  };

  const startEdit = (podcast: Podcast) => {
    setEditingId(podcast.id);
    setEditForm({
      title: podcast.title,
      youtubeUrl: podcast.youtubeUrl,
      description: podcast.description,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.title || !editForm.youtubeUrl) {
      alert("Гарчиг болон YouTube линк оруулна уу");
      return;
    }

    try {
      const res = await fetch(`/api/podcasts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingId(null);
        setEditForm({});
        fetchPodcasts();
        alert("Подкаст амжилттай шинэчлэгдлээ!");
      } else {
        const err = await res.json();
        alert(err.error || "Алдаа гарлаа");
      }
    } catch (error) {
      console.error("Error updating podcast:", error);
      alert("Подкаст шинэчлэхэд алдаа гарлаа");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" подкастыг устгах уу?`)) return;

    try {
      const res = await fetch(`/api/podcasts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPodcasts();
        alert("Подкаст амжилттай устгагдлаа!");
      } else {
        alert("Устгахад алдаа гарлаа");
      }
    } catch (error) {
      console.error("Error deleting podcast:", error);
      alert("Устгахад алдаа гарлаа");
    }
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-podcast"></i> Подкаст удирдлага
        </h1>
        <p>YouTube подкаст линкүүдийг нэмэх, засах, устгах</p>
      </div>

      {/* Stats */}
      <div className="podcast-stats-bar">
        <div className="podcast-stat-item">
          <i className="fas fa-podcast"></i>
          <span>
            Нийт: <strong>{podcasts.length}</strong>
          </span>
        </div>
      </div>

      {/* Add Form */}
      <section className="admin-section">
        <h3>
          <i className="fas fa-plus-circle"></i> Шинэ подкаст нэмэх
        </h3>
        <form onSubmit={handleAdd} className="podcast-add-form">
          <div className="podcast-add-grid">
            <div className="form-group">
              <label>
                Гарчиг <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
              <input
                type="text"
                name="title"
                placeholder="Подкаст гарчиг"
                required
              />
            </div>
            <div className="form-group">
              <label>
                YouTube линк{" "}
                <span style={{ color: "var(--primary-color)" }}>*</span>
              </label>
              <input
                type="url"
                name="youtubeUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Тайлбар</label>
              <textarea
                name="description"
                placeholder="Подкастын товч тайлбар (заавал биш)"
                rows={2}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            <i className="fas fa-plus"></i> Нэмэх
          </button>
        </form>
      </section>

      {/* Podcast List */}
      <section className="admin-section">
        <h3>
          <i className="fas fa-list"></i> Бүх подкастууд ({podcasts.length})
        </h3>

        {podcasts.length === 0 ? (
          <div className="podcast-empty-state">
            <i className="fas fa-podcast"></i>
            <p>Одоогоор подкаст нэмэгдээгүй байна</p>
          </div>
        ) : (
          <div className="admin-podcast-cards">
            {podcasts.map((podcast) => {
              const videoId = extractYouTubeId(podcast.youtubeUrl);
              const isEditing = editingId === podcast.id;

              return (
                <div
                  key={podcast.id}
                  className={`admin-podcast-card ${isEditing ? "editing" : ""}`}
                >
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="podcast-edit-form">
                      <div className="form-group">
                        <label>Гарчиг</label>
                        <input
                          type="text"
                          value={editForm.title || ""}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>YouTube линк</label>
                        <input
                          type="url"
                          value={editForm.youtubeUrl || ""}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              youtubeUrl: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Тайлбар</label>
                        <textarea
                          value={editForm.description || ""}
                          rows={2}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="podcast-edit-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleSaveEdit(podcast.id)}
                        >
                          <i className="fas fa-save"></i> Хадгалах
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={cancelEdit}
                        >
                          <i className="fas fa-times"></i> Болих
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <>
                      <div className="admin-podcast-card-thumb">
                        {videoId ? (
                          <img
                            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                            alt={podcast.title}
                          />
                        ) : (
                          <div className="admin-podcast-card-no-thumb">
                            <i className="fas fa-play-circle"></i>
                          </div>
                        )}
                      </div>
                      <div className="admin-podcast-card-body">
                        <h4>{podcast.title}</h4>
                        {podcast.description && (
                          <p className="admin-podcast-card-desc">
                            {podcast.description}
                          </p>
                        )}
                        <a
                          href={podcast.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-podcast-card-url"
                        >
                          <i className="fab fa-youtube"></i>{" "}
                          {podcast.youtubeUrl.length > 50
                            ? podcast.youtubeUrl.slice(0, 50) + "..."
                            : podcast.youtubeUrl}
                        </a>
                        <span className="admin-podcast-card-date">
                          <i className="fas fa-calendar-alt"></i>{" "}
                          {new Date(podcast.date).toLocaleDateString("mn-MN")}
                        </span>
                      </div>
                      <div className="admin-podcast-card-actions">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => startEdit(podcast)}
                          title="Засах"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() =>
                            handleDelete(podcast.id, podcast.title)
                          }
                          title="Устгах"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
