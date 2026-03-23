import ScheduleClient from "@/components/ScheduleClient";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <main className="main-content nba-schedule-page">
      <ScheduleClient />
    </main>
  );
}
