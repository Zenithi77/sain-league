import StandingsTable from '@/components/StandingsTable';
import { getStandings } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const standings = getStandings();

  return (
    <main className="main-content">
      <div className="page-header">
        <h1><i className="fas fa-medal"></i> Байр дараалал</h1>
        <p>2026 оны улирлын байр дараалал</p>
      </div>
      <StandingsTable standings={standings} />
    </main>
  );
}
