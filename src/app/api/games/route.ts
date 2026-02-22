import { NextResponse } from 'next/server';
import { readDatabase, writeDatabase, generateGameId } from '@/lib/database';
import { requireAdmin } from '@/lib/firebase-admin';
import { validateGameInput, validationErrorResponse, unauthorizedResponse, forbiddenResponse, sanitizeString } from '@/lib/validation';

export async function GET() {
  const db = readDatabase();
  const gamesWithTeams = db.games.map((game) => {
    const homeTeam = db.teams.find((t) => t.id === game.homeTeamId);
    const awayTeam = db.teams.find((t) => t.id === game.awayTeamId);
    return {
      ...game,
      homeTeam: homeTeam || null,
      awayTeam: awayTeam || null,
    };
  });
  return NextResponse.json(gamesWithTeams);
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

  const validation = validateGameInput(body);
  if (!validation.valid) {
    return validationErrorResponse(validation.errors);
  }

  const db = readDatabase();
  
  // Verify both teams exist
  const homeTeam = db.teams.find(t => t.id === body.homeTeamId);
  const awayTeam = db.teams.find(t => t.id === body.awayTeamId);
  
  if (!homeTeam || !awayTeam) {
    return validationErrorResponse(['Баг олдсонгүй']);
  }
  
  const newGame = {
    id: generateGameId(),
    date: sanitizeString(body.date) || '',
    homeTeamId: sanitizeString(body.homeTeamId) || '',
    awayTeamId: sanitizeString(body.awayTeamId) || '',
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled' as const,
    playerStats: [],
  };
  
  db.games.push(newGame);
  writeDatabase(db);
  
  return NextResponse.json(newGame, { status: 201 });
}
