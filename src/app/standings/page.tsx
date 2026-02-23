"use client";

import StandingsTable from "@/components/StandingsTable";
import { useActiveSeason, useStandings } from "@/lib/firestore-hooks";

export default function StandingsPage() {
  const { season, loading: seasonLoading } = useActiveSeason();
  const { standings, loading: standingsLoading } = useStandings(
    season?.id ?? null,
  );
  const loading = seasonLoading || standingsLoading;

  return (
    <main className="main-content">
      <div className="page-header">
        <h1>
          <i className="fas fa-medal"></i> Байр дараалал
        </h1>
        <p>2026 оны улирлын байр дараалал</p>
      </div>
      {loading ? (
        <p style={{ textAlign: "center", padding: 40 }}>Уншиж байна...</p>
      ) : standings.length === 0 ? (
        <p style={{ textAlign: "center", padding: 40 }}>Мэдээлэл олдсонгүй</p>
      ) : (
        <StandingsTable standings={standings} />
      )}
    </main>
  );
}
