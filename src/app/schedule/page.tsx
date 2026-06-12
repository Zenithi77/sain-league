import ScheduleClient from "@/components/ScheduleClient";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <main style={{ paddingTop: 24, paddingBottom: 8 }}>
      <ScheduleClient />
    </main>
  );
}
