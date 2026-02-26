"use client";

import { useState, useEffect } from "react";
import type { TeamWithAverages } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getTeams } from "@/lib/firestore";
import Link from "next/link";

export default function AdminDashboard() {
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
  const [newsCount, setNewsCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const { userData } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const teamsData = await getTeams();
      setTeams(teamsData as TeamWithAverages[]);
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        setNewsCount(data.length);
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await fetch("/api/players");
      if (res.ok) {
        const data = await res.json();
        setPlayerCount(data.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <h1>Хяналтын самбар</h1>
        <p>Тавтай морил! Лигийн ерөнхий мэдээлэл.</p>
        {userData && (
          <p className="admin-user-badge">
            <i className="fas fa-user-shield"></i> {userData.email} (
            {userData.role})
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <Link href="/admin/teams" className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "rgba(241, 95, 34, 0.15)",
              color: "var(--primary-color)",
            }}
          >
            <i className="fas fa-users"></i>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{teams.length}</span>
            <span className="admin-stat-label">Нийт баг</span>
          </div>
          <i className="fas fa-chevron-right admin-stat-arrow"></i>
        </Link>

        <Link href="/admin/players" className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "rgba(0, 114, 188, 0.15)",
              color: "var(--secondary-color)",
            }}
          >
            <i className="fas fa-basketball-ball"></i>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{playerCount}</span>
            <span className="admin-stat-label">Нийт тоглогч</span>
          </div>
          <i className="fas fa-chevron-right admin-stat-arrow"></i>
        </Link>

        <Link href="/admin/news" className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "rgba(76, 175, 80, 0.15)",
              color: "var(--success-color)",
            }}
          >
            <i className="fas fa-newspaper"></i>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{newsCount}</span>
            <span className="admin-stat-label">Нийт мэдээ</span>
          </div>
          <i className="fas fa-chevron-right admin-stat-arrow"></i>
        </Link>

        <Link href="/admin/kids" className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{ background: "rgba(156, 39, 176, 0.15)", color: "#9c27b0" }}
          >
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">—</span>
            <span className="admin-stat-label">Бүртгэл хүсэлт</span>
          </div>
          <i className="fas fa-chevron-right admin-stat-arrow"></i>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="admin-quick-actions">
        <h3>Түргэн үйлдлүүд</h3>
        <div className="admin-quick-grid">
          <Link href="/admin/players" className="admin-quick-btn">
            <i className="fas fa-user-plus"></i>
            <div>
              <strong>Тоглогч нэмэх</strong>
              <span>Шинэ тоглогч бүртгэх</span>
            </div>
          </Link>
          <Link href="/admin/teams" className="admin-quick-btn">
            <i className="fas fa-users"></i>
            <div>
              <strong>Баг нэмэх</strong>
              <span>Шинэ баг үүсгэх</span>
            </div>
          </Link>
          <Link href="/admin/news" className="admin-quick-btn">
            <i className="fas fa-newspaper"></i>
            <div>
              <strong>Мэдээ нэмэх</strong>
              <span>Шинэ мэдээ оруулах</span>
            </div>
          </Link>
          <Link href="/admin/season" className="admin-quick-btn">
            <i className="fas fa-calendar-alt"></i>
            <div>
              <strong>Улирал удирдах</strong>
              <span>Улирлын тохиргоо</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
