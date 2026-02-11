import { NextResponse } from 'next/server';
import { readDatabase, writeDatabase, calculatePlayerAverages, generatePlayerId } from '@/lib/database';

export async function GET() {
  const db = readDatabase();
  const playersWithAverages = db.players.map(calculatePlayerAverages);
  return NextResponse.json(playersWithAverages);
}

export async function POST(request: Request) {
  const db = readDatabase();
  const body = await request.json();
  
  const newPlayer = {
    id: generatePlayerId(),
    teamId: body.teamId,
    name: body.name,
    number: body.number || 0,
    position: body.position || 'Unknown',
    height: body.height || 'N/A',
    weight: body.weight || 'N/A',
    age: body.age || 0,
    image: body.image || '/assets/players/default.png',
    stats: {
      gamesPlayed: 0,
      minutesPlayed: 0,
      totalPoints: 0,
      totalRebounds: 0,
      totalAssists: 0,
      totalSteals: 0,
      totalBlocks: 0,
      totalTurnovers: 0,
      totalFouls: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
    },
  };
  
  db.players.push(newPlayer);
  writeDatabase(db);
  
  return NextResponse.json(newPlayer, { status: 201 });
}
