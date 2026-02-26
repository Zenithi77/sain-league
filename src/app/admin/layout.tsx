"use client";

import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-main-content">{children}</div>
      </div>
    </AdminGuard>
  );
}
