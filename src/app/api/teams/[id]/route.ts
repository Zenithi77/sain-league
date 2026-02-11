import { NextResponse } from 'next/server';
import { readDatabase, calculateTeamAverages, calculatePlayerAverages } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = readDatabase();
  const team = db.teams.find((t) => t.id === params.id);
  
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }
  
  const teamWithAverages = calculateTeamAverages(team, db.players);
  const teamPlayers = db.players
    .filter((p) => p.teamId === team.id)
    .map(calculatePlayerAverages);
  
  return NextResponse.json({ ...teamWithAverages, players: teamPlayers });
}
