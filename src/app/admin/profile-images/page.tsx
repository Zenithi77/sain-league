"use client";

import AdminProfileImages from "@/components/AdminProfileImages";

export default function AdminProfileImagesPage() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-image"></i> Профайл зураг
        </h1>
        <p>Тоглогч, багийн профайл зураг удирдах</p>
      </div>
      <AdminProfileImages />
    </div>
  );
}
