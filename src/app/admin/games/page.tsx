import AdminScheduleClient from "@/components/AdminScheduleClient";

export const dynamic = "force-dynamic";

export default function AdminGamesPage() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h1>
          <i className="fas fa-calendar-alt"></i> Тоглолтын хуваарь
        </h1>
        <p>Өдөр сонгоод тухайн өдрийн тоглолтуудыг харна уу</p>
      </div>
      <AdminScheduleClient />
    </div>
  );
}
