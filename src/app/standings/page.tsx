import StandingsTable from '@/components/StandingsTable';
import { TeamWithAverages } from '@/types';

async function getStandings(): Promise<TeamWithAverages[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/standings`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function StandingsPage() {
  const standings = await getStandings();

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
