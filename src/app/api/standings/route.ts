import { NextResponse } from 'next/server';
import { readDatabase, calculateTeamAverages } from '@/lib/database';

export async function GET() {
  const db = readDatabase();
  const standings = db.teams
    .map((team) => calculateTeamAverages(team, db.players))
    .sort((a, b) => {
      // Sort by wins, then by point differential
      if (b.stats.wins !== a.stats.wins) {
        return b.stats.wins - a.stats.wins;
      }
      const aDiff = a.stats.pointsFor - a.stats.pointsAgainst;
      const bDiff = b.stats.pointsFor - b.stats.pointsAgainst;
      return bDiff - aDiff;
    })
    .map((team, index) => ({ ...team, rank: index + 1 }));
  
  return NextResponse.json(standings);
}
