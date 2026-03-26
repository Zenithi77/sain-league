"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface TeamSubNavProps {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamLogo: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function TeamSubNav({
  teamId,
  teamName,
  teamShortName,
  teamLogo,
  primaryColor,
  secondaryColor,
}: TeamSubNavProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const [isSticky, setIsSticky] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { id: "teamHeader", label: "Ерөнхий" },
    { id: "teamSchedule", label: "Хуваарь" },
    { id: "teamResults", label: "Үр дүн" },
    { id: "teamRoster", label: "Тоглогчид" },
    { id: "teamStats", label: "Статистик" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 70);
      }

      // Track which section is in view
      for (const link of navLinks) {
        const el = document.getElementById(link.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom > 100) {
            setActiveSection(link.id);
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    e.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      const offset = 140; // Account for both navbars
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  };

  return (
    <div
      className="team-subnav-wrapper"
      ref={navRef}
      style={
        {
          "--team-primary": primaryColor,
          "--team-secondary": secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className={`team-subnav ${isSticky ? "team-subnav-sticky" : ""}`}>
        <div className="team-subnav-container">
          {/* Team Identity - Left Side */}
          <div className="team-subnav-identity">
            <div
              className="team-subnav-logo"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            >
              <span className="team-subnav-logo-text">{teamShortName}</span>
            </div>
            <div className="team-subnav-info">
              <span className="team-subnav-name">{teamName}</span>
            </div>
          </div>

          {/* Nav Links - Right Side */}
          <nav className="team-subnav-links">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`team-subnav-link ${activeSection === link.id ? "active" : ""}`}
                onClick={(e) => handleNavClick(e, link.id)}
              >
                {link.label}
              </a>
            ))}
            <Link href="/teams" className="team-subnav-link team-subnav-back">
              <i className="fas fa-th-large"></i>
              <span>Бүх багууд</span>
            </Link>
          </nav>
        </div>

        {/* Team color accent bar at the bottom */}
        <div
          className="team-subnav-accent"
          style={{
            background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        />
      </div>
    </div>
  );
}
