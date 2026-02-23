import ScheduleClient from "@/components/ScheduleClient";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <main className="main-content">
      <div className="page-header schedule-page-header">
        <div className="page-header-content">
          <h1>
            <i className="fas fa-calendar-alt"></i> Тоглолтын хуваарь
          </h1>
          <p>Өдөр сонгоод тухайн өдрийн тоглолтуудыг харна уу</p>
        </div>
      </div>

      <ScheduleClient />
    </main>
  );
}
