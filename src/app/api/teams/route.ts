import { NextResponse } from 'next/server';
import { readDatabase, calculateTeamAverages } from '@/lib/database';
import { requireAdmin } from '@/lib/firebase-admin';
import { validateTeamInput, validationErrorResponse, unauthorizedResponse, forbiddenResponse, sanitizeString } from '@/lib/validation';

export async function GET() {
  const db = readDatabase();
  const teamsWithAverages = db.teams.map((team) =>
    calculateTeamAverages(team, db.players)
  );
  return NextResponse.json(teamsWithAverages);
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

  const validation = validateTeamInput(body);
  if (!validation.valid) {
    return validationErrorResponse(validation.errors);
  }

  const { readDatabase, writeDatabase, generateTeamId } = await import('@/lib/database');
  
  const db = readDatabase();
  
  // Check if team with same name exists
  const existingTeam = db.teams.find(t => 
    t.name.toLowerCase() === (body.name as string).toLowerCase() ||
    t.shortName.toLowerCase() === (body.shortName as string).toLowerCase()
  );
  if (existingTeam) {
    return validationErrorResponse(['Энэ нэртэй баг аль хэдийн бүртгэлтэй байна']);
  }
  
  const newTeam = {
    id: generateTeamId(),
    name: sanitizeString(body.name) || '',
    shortName: sanitizeString(body.shortName) || '',
    logo: body.logo || '/assets/logos/default.png',
    city: sanitizeString(body.city) || '',
    coach: {
      id: `coach-${Date.now()}`,
      name: sanitizeString(body.coachName) || '',
      image: '/assets/coaches/default.png',
    },
    colors: {
      primary: body.primaryColor || '#F15F22',
      secondary: body.secondaryColor || '#0072BC',
    },
    stats: {
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      gamesPlayed: 0,
    },
  };
  
  db.teams.push(newTeam);
  writeDatabase(db);
  
  return NextResponse.json(newTeam, { status: 201 });
}
