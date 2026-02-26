"use client";

import AdminOnboardingList from "@/components/AdminOnboardingList";

export default function AdminKidsPage() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-basketball-ball"></i> Тоглогчид (Бүртгэл)
        </h1>
        <p>Тоглогчдын бүртгэлийн хүсэлтүүд</p>
      </div>
      <AdminOnboardingList role="kid" />
    </div>
  );
}
