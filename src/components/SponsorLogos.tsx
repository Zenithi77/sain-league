"use client";

import { useEffect, useState } from "react";
import type { Sponsor } from "@/types";

export default function SponsorLogos() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    fetch("/api/sponsors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSponsors(data);
      })
      .catch(() => {});
  }, []);

  if (sponsors.length === 0) return null;

  return (
    <section className="sponsors-section">
      <div className="sponsors-header">
        <span className="sponsors-tag">ХАМТРАГЧИД</span>
        <h2 className="sponsors-title">
          <i className="fas fa-handshake"></i> Хамтрагч байгууллагууд
        </h2>
        <p className="sponsors-subtitle">
          Бидний хамтрагч байгууллагуудад талархал илэрхийлье
        </p>
      </div>
      <div className="sponsors-grid">
        {sponsors.map((sponsor) => (
          <a
            key={sponsor.id}
            href={sponsor.website || "#"}
            target={sponsor.website ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="sponsor-item"
            title={sponsor.name}
          >
            <div className="sponsor-logo-wrapper">
              {sponsor.logo ? (
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="sponsor-logo"
                />
              ) : (
                <div className="sponsor-name-fallback">
                  <i className="fas fa-building"></i>
                  <span>{sponsor.name}</span>
                </div>
              )}
            </div>
            <span className="sponsor-label">{sponsor.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
