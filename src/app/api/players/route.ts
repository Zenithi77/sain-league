import { NextResponse } from 'next/server';
import { readDatabase, writeDatabase, calculatePlayerAverages, generatePlayerId } from '@/lib/database';
import { requireAdmin } from '@/lib/firebase-admin';
import { validatePlayerInput, validationErrorResponse, unauthorizedResponse, forbiddenResponse, sanitizeString } from '@/lib/validation';

export async function GET() {
  const db = readDatabase();
  const playersWithAverages = db.players.map(calculatePlayerAverages);
  return NextResponse.json(playersWithAverages);
}

export async function POST(request: Request) {
  // Authentication check - admin only
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return auth.error?.includes('Админ') 
      ? forbiddenResponse(auth.error) 
      : unauthorizedResponse(auth.error);
  }

  // Parse and validate input
  let body: any;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['Буруу JSON формат']);
  }

  const validation = validatePlayerInput(body);
  if (!validation.valid) {
    return validationErrorResponse(validation.errors);
  }

  const db = readDatabase();
  
  // Verify team exists
  const team = db.teams.find(t => t.id === body.teamId);
  if (!team) {
    return validationErrorResponse(['Баг олдсонгүй']);
  }
  
  const newPlayer = {
    id: generatePlayerId(),
    teamId: sanitizeString(body.teamId) || '',
    name: sanitizeString(body.name) || '',
    number: Math.min(Math.max(parseInt(body.number) || 0, 0), 99),
    position: sanitizeString(body.position) || 'Unknown',
    height: sanitizeString(body.height) || 'N/A',
    weight: sanitizeString(body.weight) || 'N/A',
    age: Math.min(Math.max(parseInt(body.age) || 0, 0), 100),
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
