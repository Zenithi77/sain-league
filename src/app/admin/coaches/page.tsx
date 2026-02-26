"use client";

import AdminOnboardingList from "@/components/AdminOnboardingList";

export default function AdminCoachesPage() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-clipboard"></i> Дасгалжуулагчид (Бүртгэл)
        </h1>
        <p>Дасгалжуулагчдын бүртгэлийн хүсэлтүүд</p>
      </div>
      <AdminOnboardingList role="coach" />
    </div>
  );
}
