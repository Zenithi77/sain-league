"use client";

import AdminSeasonManager from "@/components/AdminSeasonManager";

export default function AdminSeasonPage() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-calendar-alt"></i> Улирал удирдах
        </h1>
        <p>Улирал үүсгэх, идэвхжүүлэх, удирдах</p>
      </div>
      <AdminSeasonManager />
    </div>
  );
}
