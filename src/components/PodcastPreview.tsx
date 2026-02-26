"use client";

import { useEffect, useState } from "react";
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

export default function PodcastPreview() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);

  useEffect(() => {
    fetch("/api/podcasts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPodcasts(data.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  if (podcasts.length === 0) return null;

  return (
    <section className="podcast-section">
      <div className="podcast-header">
        <span className="podcast-tag">ПОДКАСТ</span>
        <h2 className="podcast-title">
          <i className="fas fa-podcast"></i> Подкаст
        </h2>
        <p className="podcast-subtitle">
          Манай хамгийн сүүлийн подкаст дугааруудыг үзээрэй
        </p>
      </div>
      <div className="podcast-grid">
        {podcasts.map((podcast) => {
          const videoId = extractYouTubeId(podcast.youtubeUrl);
          return (
            <a
              key={podcast.id}
              href={podcast.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="podcast-card"
            >
              <div className="podcast-thumbnail">
                {videoId ? (
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                    alt={podcast.title}
                    className="podcast-thumb-img"
                  />
                ) : (
                  <div className="podcast-thumb-placeholder">
                    <i className="fas fa-play-circle"></i>
                  </div>
                )}
                <div className="podcast-play-overlay">
                  <i className="fas fa-play"></i>
                </div>
              </div>
              <div className="podcast-card-body">
                <h3 className="podcast-card-title">{podcast.title}</h3>
                {podcast.description && (
                  <p className="podcast-card-desc">{podcast.description}</p>
                )}
                <span className="podcast-card-date">
                  <i className="fas fa-calendar-alt"></i>{" "}
                  {new Date(podcast.date).toLocaleDateString("mn-MN")}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
