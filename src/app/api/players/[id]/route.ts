import { NextResponse } from 'next/server';
import { readDatabase, calculatePlayerAverages } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = readDatabase();
  const player = db.players.find((p) => p.id === params.id);
  
  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
  
  const playerWithAverages = calculatePlayerAverages(player);
  const team = db.teams.find((t) => t.id === player.teamId);
  
  return NextResponse.json({ ...playerWithAverages, team });
}
